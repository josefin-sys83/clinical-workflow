import { CanActivate, ExecutionContext, Injectable, NotFoundException } from '@nestjs/common';
import { getPool } from '../../db/pg';

// Applied at the controller level on every controller keyed by :projectId (projects,
// workflow, audit, documents) so a project can only be read/written/transitioned by a
// user belonging to the same company that owns it. Superadmins bypass this — their
// role is to administer across companies (see admin.module.ts).
//
// ARCHITECTURAL LIMITATION — READ BEFORE ADDING A NEW ENDPOINT:
// This guard only ever reads req.params.projectId (the :projectId path segment). It does
// NOT look at the request body, query string, or anything else. That's a deliberate,
// narrow contract, not an oversight — but it means the tenant-isolation check below is
// only as good as every route actually putting the project id in the path.
//
// If you add an endpoint that identifies "which project" via req.body.projectId,
// ?projectId=..., or any other mechanism instead of a :projectId path param, THIS GUARD
// WILL SILENTLY NO-OP FOR IT (see the `if (!projectId) return true` below — no path param
// means "not project-scoped," not "denied") and that endpoint will have NO tenant
// isolation at all, even though it sits behind the same @UseGuards(... ProjectAccessGuard)
// as everything else in the controller.
//
// Two ways to stay safe:
//   1. (Preferred) Always route project-scoped endpoints as `/.../:projectId/...` so this
//      guard covers them automatically — this is what every existing endpoint does.
//   2. If a :projectId path param is genuinely not possible for some new route, do NOT
//      rely on this guard at all — extend it to also check req.body/req.query for that
//      route, or write a dedicated guard, and prove to yourself it's actually being
//      invoked (a passing test that a cross-company request gets 404, not just 200).
@Injectable()
export class ProjectAccessGuard implements CanActivate {
  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest();
    const projectId = req.params?.projectId;
    // No :projectId path param => this guard treats the route as out of scope and allows
    // it through unchecked (see the limitation above). Do not add project-scoped logic to
    // a route that hits this branch without also updating this guard.
    if (!projectId) return true; // route isn't scoped to a single project (e.g. list/create)

    const user = req.user as { companyId?: string; isSuperadmin?: boolean } | undefined;
    if (user?.isSuperadmin) return true;

    const { rows } = await getPool().query(
      `select company_id from projects where id = $1`,
      [projectId],
    );
    const project = rows[0];
    // Same 404 whether the project doesn't exist or belongs to another company — never
    // reveal to a caller outside the owning company that a given project id exists.
    if (!project || !user?.companyId || project.company_id !== user.companyId) {
      throw new NotFoundException('Project not found');
    }
    return true;
  }
}
