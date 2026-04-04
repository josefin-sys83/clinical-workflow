# Clinical System Backend (NestJS + Postgres)

Production-oriented backend starter that matches the frontend API.

## Quick start

### 1) Configure Postgres

Set `DATABASE_URL` in `backend/.env` (see `.env.example`).

### 2) Run migrations

```bash
psql "$DATABASE_URL" -f db/migrations/001_init.sql
psql "$DATABASE_URL" -f db/migrations/002_document_artifacts.sql
psql "$DATABASE_URL" -f db/migrations/003_artifact_verification_and_roles.sql
psql "$DATABASE_URL" -f db/migrations/004_artifact_signatures.sql
- db/migrations/005_addendums.sql
```

### 3) Install + run

```bash
npm install
cp .env.example .env
npm run dev
```

API runs on `http://localhost:3001` and Swagger docs on `http://localhost:3001/docs`.

## Auth (JWT) + demo users

Login:

- `POST /api/auth/login`

Demo users (username/password):

- `admin/admin`
- `author/author`
- `reviewer/reviewer`
- `approver/approver`

Most endpoints require a Bearer token. Signing endpoints require `admin` or `approver`.

## Documents (artifacts)

- Finalize export: `POST /api/projects/:projectId/documents/:docType/finalize`
- Download: `GET /api/projects/:projectId/documents/artifacts/:artifactId`
- Verify hash: `GET /api/projects/:projectId/documents/artifacts/:artifactId/verify`

## Signing (RSA-SHA256)

- Sign: `POST /api/projects/:projectId/documents/artifacts/:artifactId/sign`
- Signatures: `GET /api/projects/:projectId/documents/artifacts/:artifactId/signatures`
- Verify chain: `GET /api/projects/:projectId/documents/artifacts/:artifactId/verify-chain`

### Key management

For development, the backend can generate an ephemeral RSA keypair.

For stable signing keys, set:

- `SIGNING_PRIVATE_KEY_PEM`
- `SIGNING_PUBLIC_KEY_PEM`

in `backend/.env`.
