import { Injectable } from '@nestjs/common';
import { ThrottlerGuard } from '@nestjs/throttler';

// Rate-limits /api/auth/login so a credential-stuffing / brute-force script can't hammer
// the endpoint unbounded (pentest F1). Login has no authenticated user yet — unlike
// AiThrottlerGuard, which keys on req.user.userId — so this keys on the caller's IP.
//
// Deliberately does NOT read X-Forwarded-For: this app has no `trust proxy` configured
// (no allowlist of trusted hops), so that header is entirely attacker-controlled — a
// caller can set a new one on every request and reset their own rate limit for free
// (found in QA regression testing: 36/36 spoofed-header requests went through unthrottled
// vs. correctly blocked after 10 when the header was left alone). req.socket.remoteAddress
// is the TCP peer address, which cannot be spoofed at the HTTP layer. If this is ever
// deployed behind a real reverse proxy, that proxy must be configured to strip any
// client-supplied X-Forwarded-For and set its own — and this guard would need to be
// paired with Express `trust proxy` pointed at that specific proxy, not reintroduce a
// blanket trust of the header.
// Uses the 'default' throttler tier registered in app.module.ts (10 requests / 60s).
@Injectable()
export class LoginThrottlerGuard extends ThrottlerGuard {
  protected async getTracker(req: Record<string, any>): Promise<string> {
    return req.socket?.remoteAddress || req.ip || 'unknown';
  }
}
