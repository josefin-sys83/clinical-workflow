import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Role } from './roles.decorator';

type DemoUser = { id: string; username: string; password: string; name: string; roles: Role[] };

// NOTE: This is a demo in-memory user store. Replace with real IdP (Entra/Keycloak/Auth0) later.
const USERS: DemoUser[] = [
  { id: 'u_admin', username: 'admin', password: 'admin', name: 'Admin User', roles: ['admin', 'author', 'reviewer', 'approver'] },
  { id: 'u_author', username: 'author', password: 'author', name: 'Author User', roles: ['author'] },
  { id: 'u_reviewer', username: 'reviewer', password: 'reviewer', name: 'Reviewer User', roles: ['reviewer'] },
  { id: 'u_approver', username: 'approver', password: 'approver', name: 'Approver User', roles: ['approver'] },
];

@Injectable()
export class AuthService {
  constructor(private readonly jwt: JwtService) {}

  login(username: string, password: string) {
    const user = USERS.find((u) => u.username === username && u.password === password);
    if (!user) throw new UnauthorizedException('Invalid credentials');

    const access_token = this.jwt.sign(
      { name: user.name, roles: user.roles },
      { subject: user.id },
    );

    return {
      access_token,
      token_type: 'Bearer',
      user: { id: user.id, name: user.name, roles: user.roles },
    };
  }

  me(user: { userId: string; name: string; roles: Role[] }) {
    return { id: user.userId, name: user.name, roles: user.roles };
  }
}
