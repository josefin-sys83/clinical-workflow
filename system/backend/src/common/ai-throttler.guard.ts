import { Injectable, ExecutionContext } from '@nestjs/common';
import { ThrottlerGuard } from '@nestjs/throttler';

// Rate-limits the expensive AI generation/analysis endpoints. Every route this guard is
// applied to sits behind JwtAuthGuard already, so req.user is populated by the time this
// guard runs — key on the authenticated user (not IP) so the limit can't be sidestepped by
// requests fanning out across proxies/NAT, and so it correctly limits a single user even if
// they spread requests across many projects they have access to.
@Injectable()
export class AiThrottlerGuard extends ThrottlerGuard {
  protected async getTracker(req: Record<string, any>): Promise<string> {
    return req.user?.userId ? `user:${req.user.userId}` : req.ip;
  }
}
