# PMO Hub

PMO Hub is a server-first portfolio platform for projects and operational tasks. NestJS + Prisma + MSSQL own all business state and rules; React renders canonical read models and refreshes TanStack Query caches only after a successful commit.

## Local setup

1. Start MSSQL: `docker compose up -d`.
2. Configure `backend/.env` from `backend/.env.example`. Required values include `DATABASE_URL`, JWT secrets, `FRONTEND_ORIGINS`, and cookie settings.
3. In `backend`, run `npm install`, `npm run db:migrate`, `npm run db:seed`, then `npm run dev`.
4. Set `VITE_API_URL` in `frontend/.env.local`; in `frontend`, run `npm install` and `npm run dev`.

The database is intentionally initialized from the single `20260824190000_initial` migration. There is no data migration from the former Passport model. Reset development databases before applying it.

## Data ownership

- `Initiative`: immutable kind and global name.
- `InitiativeYear`: year-specific strategic goal.
- `PreparationStage`: defaults for a year.
- `QuarterCard`: independently editable quarterly metadata, notes, custom values, status and frozen size snapshot.
- `ScopeItem`: task lineage, fixed status code, frozen weight snapshot and executor departments.

Backup import remains unavailable in this release. Administrators can export filtered initiative reports to Excel and privacy-controlled JSON for AI. SUPER_ADMIN can additionally download a sanitized full database snapshot; password hashes and refresh sessions are never included. Demo initiatives and local mutation mode are not supported.

## Verification

Run `typecheck`, `test`, and `build` in both packages. Regenerate contracts with:

```text
cd backend && npm run openapi
cd ../frontend && npm run api:generate
```

See [ARCHITECTURE.md](ARCHITECTURE.md) for the ER model and transactional flows.

## Data exports

The administration page loads export availability and preview counts without loading frontend portfolio collections. Excel and AI JSON respect year, period and initiative-kind filters. The full JSON snapshot ignores those filters, contains all database tables except refresh sessions, omits user password hashes, and is restricted to SUPER_ADMIN.

Excel generation uses an in-memory workbook to preserve rich text. `EXPORT_MAX_EXCEL_CARDS` and `EXPORT_MAX_JSON_ROWS` bound memory usage and can be adjusted per environment.
