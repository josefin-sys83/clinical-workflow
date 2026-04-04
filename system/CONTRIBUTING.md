# Contributing

## Dev setup
1. `npm run install:all`
2. Create environment files:
   - Frontend: copy `.env.example` → `.env.local`
   - Backend: copy `backend/.env.example` → `backend/.env`
3. Run:
   - `npm run dev:full` (frontend + backend)
   - or run them separately with `npm run dev:frontend` and `npm run dev:backend`

## Conventions
- Keep shared UI components in `src/shared/ui/`
- Keep workflow logic in `src/shared/workflow/`
- Prefer adding new API calls under `src/shared/services/` and `src/shared/api/`

## DB migrations
Migrations live under `backend/db/migrations/` and are applied with `psql`.
