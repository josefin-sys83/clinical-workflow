import { CanActivate, ExecutionContext, Injectable, NotFoundException } from '@nestjs/common';
import { getPool } from '../../db/pg';

// Applied at the controller level on every controller keyed by :projectId (projects,
// workflow, audit, documents) so a project can only be read/written/transitioned by a
// user belonging to the same company that owns it. Superadmins bypass this — their
// role is to administer across companies (see admin.module.ts).
//
// Architectural limitation: this guard only ever reads req.params.projectId. Any future
// endpoint that accepts a project id via the request body or a query string instead of
// a :projectId path param would silently bypass this check entirely — remember to add
// an equivalent guard (or extend this one) for such routes rather than assuming they're
// covered.
@Injectable()
export class ProjectAccessGuard implements CanActivate {
  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest();
    const projectId = req.params?.projectId;
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
