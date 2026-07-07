import 'reflect-metadata';
import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { JwtService } from '@nestjs/jwt';
import helmet from 'helmet';
import { AppModule } from './app.module';

// The generated OpenAPI document (SwaggerModule.createDocument) enumerates every
// endpoint, DTO shape and parameter name — a free recon map for an attacker if left
// open. Require a valid admin-role JWT (same secret/verification as the real API) for
// both the UI page and its underlying JSON before mounting SwaggerModule.
function requireAdminForDocs(jwt: JwtService) {
  return (req: any, res: any, next: any) => {
    const authHeader = req.headers['authorization'] as string | undefined;
    const bearerToken = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : undefined;
    // Swagger UI's own page navigation can't set an Authorization header, so also
    // accept the token as a query param for that one case (still requires a valid,
    // signed admin token — just a different transport for it).
    const token = bearerToken ?? (typeof req.query?.token === 'string' ? req.query.token : undefined);
    if (!token) {
      return res.status(401).json({ statusCode: 401, message: 'Unauthorized' });
    }
    try {
      const payload = jwt.verify(token);
      const roles: string[] = Array.isArray(payload?.roles) ? payload.roles : [];
      if (!roles.includes('admin')) {
        return res.status(403).json({ statusCode: 403, message: 'Forbidden' });
      }
      return next();
    } catch {
      return res.status(401).json({ statusCode: 401, message: 'Unauthorized' });
    }
  };
}

async function bootstrap() {
  const app = await NestFactory.create(AppModule, { cors: false });
  // CSP as defense-in-depth against the stored-XSS class of bug fixed in Fix 15: even
  // if a future sanitizer gap let a <script>/event-handler payload through, script-src
  // 'self' (no 'unsafe-inline', no 'unsafe-eval') blocks it from executing. This backend
  // only serves HTML for the Swagger UI at /docs — the SPA itself is served by a
  // separate frontend process/host, so an equivalent CSP needs to be configured there
  // too for this to protect the actual app pages, not just /docs.
  app.use(
    helmet({
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          scriptSrc: ["'self'"],
          // Swagger UI's static HTML ships two inline <style> blocks; nothing here
          // needs inline/eval'd script, so only styleSrc gets the 'unsafe-inline' carve-out.
          styleSrc: ["'self'", "'unsafe-inline'"],
          imgSrc: ["'self'", 'data:'],
          fontSrc: ["'self'"],
          connectSrc: ["'self'"],
          objectSrc: ["'none'"],
          baseUri: ["'self'"],
          formAction: ["'self'"],
          frameAncestors: ["'none'"],
        },
      },
      // This API is deliberately called cross-origin by the frontend (see CORS config
      // below) and returns file downloads (PDF/docx) — the default same-origin
      // Cross-Origin-Resource-Policy and Cross-Origin-Embedder-Policy are for isolating
      // a page that embeds subresources, which doesn't apply to a pure JSON/file API.
      crossOriginResourcePolicy: { policy: 'cross-origin' },
      crossOriginEmbedderPolicy: false,
    }),
  );
  const corsOrigin = process.env.CORS_ORIGIN?.trim();
  const allowedOrigins = corsOrigin
    ? corsOrigin.split(',').map((o) => o.trim()).filter(Boolean)
    : ['http://localhost:5173'];
  app.enableCors({
    origin: allowedOrigins,
    credentials: false,
    methods: ['GET','POST','PUT','PATCH','DELETE','OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  });
  app.use(require('express').json({ limit: '50mb' }));
  app.use(require('express').urlencoded({ limit: '50mb', extended: true }));
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
  app.use(['/docs', '/docs-json'], requireAdminForDocs(app.get(JwtService)));
  const config = new DocumentBuilder()
    .setTitle('Clinical System API')
    .setDescription('Backend API for the Clinical System workflow.')
    .setVersion('0.1.0')
    .addBearerAuth()
    .build();
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('/docs', app, document);
  const port = Number(process.env.PORT ?? 3001);
  await app.listen(port);
  console.log(`API running on http://localhost:${port} (docs at /docs)`);
}
bootstrap();