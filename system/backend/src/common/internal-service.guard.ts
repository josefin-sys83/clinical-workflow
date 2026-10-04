import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { timingSafeEqual } from 'crypto';

// Admits only internal services that hold the shared service token (the same
// AI_SERVICE_TOKEN the backend sends to the AI service). These routes carry no
// user identity and are never called from the browser.
@Injectable()
export class InternalServiceGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const expected = process.env.AI_SERVICE_TOKEN || '';
    const header: string = context.switchToHttp().getRequest().headers?.authorization || '';
    const supplied = header.startsWith('Bearer ') ? header.slice(7) : '';
    if (!expected || !supplied || !sameToken(supplied, expected)) throw new UnauthorizedException();
    return true;
  }
}

function sameToken(a: string, b: string): boolean {
  const left = Buffer.from(a);
  const right = Buffer.from(b);
  return left.length === right.length && timingSafeEqual(left, right);
}
