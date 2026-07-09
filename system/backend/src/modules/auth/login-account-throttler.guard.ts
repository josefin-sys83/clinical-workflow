import { CanActivate, ExecutionContext, HttpException, HttpStatus, Injectable } from '@nestjs/common';

const WINDOW_MS = 60_000;
const MAX_ATTEMPTS = 10;

// Per-account brute-force limit, independent of LoginThrottlerGuard's per-IP one. That
// guard alone doesn't stop a credential-stuffing run distributed across many real source
// IPs (e.g. a botnet or a rotating proxy pool) targeting a single account — this catches
// that case by keying on the submitted email instead. Same window/threshold as the IP
// guard so both close together at once during normal brute-force testing.
// In-memory, single-process — same durability tradeoff ThrottlerModule's own default
// storage already makes; acceptable here since this is a defense-in-depth backstop; the
// IP-based guard is still the first line of defense.
const attemptsByEmail = new Map<string, number[]>();

@Injectable()
export class LoginAccountThrottlerGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const req = context.switchToHttp().getRequest();
    const email = String(req.body?.email ?? '').trim().toLowerCase();
    if (!email) return true; // no account identified — let the controller's own validation handle it

    const now = Date.now();
    const recent = (attemptsByEmail.get(email) ?? []).filter((t) => now - t < WINDOW_MS);
    if (recent.length >= MAX_ATTEMPTS) {
      throw new HttpException('Too many login attempts for this account. Please try again later.', HttpStatus.TOO_MANY_REQUESTS);
    }
    recent.push(now);
    attemptsByEmail.set(email, recent);
    return true;
  }
}
