import 'reflect-metadata';
import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { JwtService } from '@nestjs/jwt';
import helmet from 'helmet';
import express, { Request, Response, NextFunction } from 'express';
import { join } from 'path';
import { existsSync } from 'fs';
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
  // 'self' (no 'unsafe-inline', no 'unsafe-eval') blocks it from executing. As of the
  // single-container deployment this process serves the SPA as well as the Swagger UI at
  // /docs, so these directives now apply to the actual app pages too — widening any of
  // them weakens the app itself, not just the docs.
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
          // MSAL signs in against Entra ID from the browser, so the SPA has to reach
          // login.microsoftonline.com directly and render its iframe/redirect. Scoped to
          // that one host rather than relaxed globally.
          connectSrc: ["'self'", 'https://login.microsoftonline.com'],
          frameSrc: ["'self'", 'https://login.microsoftonline.com'],
          objectSrc: ["'none'"],
          baseUri: ["'self'"],
          formAction: ["'self'", 'https://login.microsoftonline.com'],
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
  app.use(express.json({ limit: '50mb' }));
  app.use(express.urlencoded({ limit: '50mb', extended: true }));
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
  // Single-container deployment: the Vite build is copied to ../public alongside dist/,
  // and this process serves it. Every backend route already carries an /api prefix
  // (@Controller('/api/...')), so the SPA can safely own every other path. Registered via
  // app.use(), which runs ahead of Nest's router — hence the explicit /api and /docs
  // bail-out below, without which the fallback would swallow the whole API.
  // In local dev this directory doesn't exist; Vite serves the SPA on :5173 instead and
  // proxies /api here, so the middleware simply never finds a file to send.
  const clientDir = join(__dirname, '..', 'public');
  if (existsSync(clientDir)) {
    app.use(express.static(clientDir));
    app.use((req: Request, res: Response, next: NextFunction) => {
      if (req.path.startsWith('/api') || req.path.startsWith('/docs')) return next();
      res.sendFile(join(clientDir, 'index.html'));
    });
  }

  const port = Number(process.env.PORT ?? 3001);
  await app.listen(port);
  console.log(`API running on http://localhost:${port} (docs at /docs)`);
}
bootstrap();