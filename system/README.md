# Clinical Document Workflow System (Frontend + Backend)

This repository contains a **single, merged application** for a MedTech-style document workflow:

- **Protocol**: Make → Review → PDF/Finalize
- **Report**: Make → Review → PDF/Finalize
- **Audit trail**: server-style events for transitions, finalize, verify, sign
- **Artifacts**: immutable PDF exports with **SHA-256** hash
- **Signing**: RSA signature over the artifact hash (RBAC protected)

## Repo structure

- `/src` — Frontend (Vite + React + TypeScript + Tailwind + shadcn/ui)
- `/backend` — Backend (NestJS + Postgres + Swagger)
- `/openapi.yaml` — API contract (high-level)
- `/.env.example` — Frontend env template

## Run: frontend only (default, mock API)

```bash
npm install
npm run dev
```

This mode uses an in-browser mock for `/api/*` so you can develop UI without a database.

## Run: backend + frontend (real API)

### 1) Start Postgres and backend

See `backend/README.md`.

### 2) Configure frontend to use backend

Create `.env.local` in the repo root:

```bash
VITE_USE_MOCK_API=false
VITE_API_TOKEN=PASTE_JWT_HERE
```

Then run:

```bash
npm run dev
```

Vite proxies `/api` to `http://localhost:3001`.

## Quick demo flow (real API)

1. Login (get token):
   - `POST /api/auth/login` (demo users in backend README)
2. Open a project and proceed through:
   - Protocol Review → Approve → Protocol PDF → Finalize export
3. Verify + Sign:
   - Verify artifact (`/verify` or `/verify-chain`)
   - Sign artifact (`/sign`) — requires `admin` or `approver`

## Notes

- The in-browser mock is intentionally lightweight; the backend is the source of truth for production behavior.
- For production-grade signing (X.509 / eIDAS / TSA), treat current RSA signing as an integrity + accountability baseline.

---

## GitHub‑ready monorepo scripts (frontend + backend)

From the repo root you can now run:

```bash
# install both frontend + backend
npm run install:all

# run frontend + backend together (two terminals in one)
npm run dev:full
```

Individual dev commands:

```bash
npm run dev:frontend
npm run dev:backend
```

Build both:

```bash
npm run build:all
```

> Note: Database migrations are still executed via `psql` (see `backend/README.md`).
