import { ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

// A user flagged must_reset_password (temp password never changed) is authenticated but
// must not be able to use the API for anything except changing their password and logging
// out. This is enforced here — not just in the frontend AuthGuard — because every
// controller that protects a route with JwtAuthGuard picks this up automatically, so a
// direct API client (curl, Postman, a compromised temp password) can't bypass it by
// skipping the SPA. See src/shared/auth/AuthGuard.tsx for the matching frontend redirect.
//
// GET /api/me is also allowed: it's read-only (reveals nothing more than the login
// response already did) and the frontend needs it to learn must_reset_password is set
// in the first place — without it, AuthGuard could never render the reset screen.
const ALLOWED_WHILE_RESET_REQUIRED: Array<{ method: string; path: string }> = [
  { method: 'GET', path: '/api/me' },
  { method: 'PATCH', path: '/api/settings/password' },
  { method: 'POST', path: '/api/auth/logout' },
];

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  async canActivate(context: ExecutionContext): Promise<boolean> {
    const authenticated = await super.canActivate(context);
    if (!authenticated) return false;

    const req = context.switchToHttp().getRequest();
    const user = req.user as { mustResetPassword?: boolean } | undefined;
    if (!user?.mustResetPassword) return true;

    const isAllowed = ALLOWED_WHILE_RESET_REQUIRED.some(
      (r) => r.method === req.method && r.path === req.path,
    );
    if (isAllowed) return true;

    throw new ForbiddenException('Password reset required before continuing');
  }
}
