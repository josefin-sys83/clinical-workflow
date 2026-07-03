import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { Role } from './roles.decorator';

export type JwtPayload = {
  sub: string;
  name: string;
  roles: Role[];
  company_id?: string;
  is_superadmin?: boolean;
};

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(config: ConfigService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: config.get<string>('JWT_SECRET', 'dev-secret-change-me'),
    });
  }

  async validate(payload: JwtPayload) {
    return {
      userId: payload.sub,
      name: payload.name,
      roles: payload.roles,
      companyId: payload.company_id,
      isSuperadmin: payload.is_superadmin ?? false,
    };
  }
}
