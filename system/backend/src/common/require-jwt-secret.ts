import { ConfigService } from '@nestjs/config';

// JWT_SECRET previously fell back to the hardcoded string 'dev-secret-change-me' if the env
// var was unset, meaning a misconfigured deployment would silently sign and accept tokens
// with a publicly-known secret. Fail startup instead — there is no safe default for this.
export function requireJwtSecret(config: ConfigService): string {
  const secret = config.get<string>('JWT_SECRET');
  if (!secret) {
    throw new Error('JWT_SECRET environment variable must be set (no insecure default is provided)');
  }
  return secret;
}
