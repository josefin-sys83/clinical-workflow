import { Injectable } from '@nestjs/common';
import { ThrottlerGuard } from '@nestjs/throttler';

// Rate-limits /api/auth/login so a credential-stuffing / brute-force script can't hammer
// the endpoint unbounded (pentest F1). Login has no authenticated user yet — unlike
// AiThrottlerGuard, which keys on req.user.userId — so this keys on the caller's IP,
// resolved the same way createSignature() does (honour X-Forwarded-For first, since this
// app has no `trust proxy` configured and may sit behind a reverse proxy in production).
// Uses the 'default' throttler tier registered in app.module.ts (10 requests / 60s).
@Injectable()
export class LoginThrottlerGuard extends ThrottlerGuard {
  protected async getTracker(req: Record<string, any>): Promise<string> {
    return (
      (req.headers['x-forwarded-for'] as string | undefined)?.split(',')[0]?.trim() ||
      req.socket?.remoteAddress ||
      req.ip ||
      'unknown'
    );
  }
}
