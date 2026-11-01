# Mentorship+ API — Phase 2 Foundation

This API lives in the `api/` subfolder of the unified Mentorship+ workspace. Open the workspace root in VS Code. For full database, workspace, mobile, and GitHub setup instructions, see the root `README.md`. The existing mobile screens, routes, theme and local state have not been changed in this phase.

## Included

- NestJS + TypeScript API scaffold.
- PostgreSQL data model managed by Prisma.
- Initial SQL migration and idempotent reference-data seed.
- Environment validation.
- Global request validation, security headers, explicit browser-origin allowlist, and a safe API exception filter.
- Liveness and database-readiness endpoints.
- Initial service and configuration tests.
- Foundational schema for members, categories, interests, counsellors, topics, discussions, assignments, appointments, ratings and audit logs.

## Requirements

- Node.js 20.11 or newer.
- PostgreSQL 14 or newer (or a managed PostgreSQL service).
- npm.

## Local setup

Run these commands from this `api` directory.

1. Install dependencies:

   ```bash
   npm install
   ```

2. Create your local environment file:

   ```bash
   cp .env.example .env
   ```

   On Windows PowerShell, use `Copy-Item .env.example .env` instead. Update `DATABASE_URL` to match your local PostgreSQL database. Do not commit `.env`.

3. Create an empty database named `mentorship_plus`, or change the connection string to an existing development database.

4. Generate Prisma Client and apply the checked-in migration:

   ```bash
   npm run prisma:generate
   npm run prisma:migrate:deploy
   npm run prisma:seed
   ```

   For iterative local schema work after the initial migration, use `npm run prisma:migrate:dev -- --name descriptive_change`.

5. Run the tests and build:

   ```bash
   npm test -- --runInBand
   npm run build
   ```

6. Start the API:

   ```bash
   npm run start:dev
   ```

The API listens on port `4000` by default. Its default prefix is `/api/v1`.

## Health endpoints

- `GET /api/v1` — API metadata.
- `GET /api/v1/health/live` — process liveness; does not require a database query.
- `GET /api/v1/health/ready` — readiness check; returns success only when PostgreSQL can be queried.

## Database migration policy

- Commit every migration alongside the schema change that created it.
- Apply migrations to staging/production with `npm run prisma:migrate:deploy` after reviewing the SQL.
- Do not use `prisma db push` against production.
- Take and verify backups before high-risk schema changes.

## Security notes

- This phase does **not** implement production authentication, authorization guards, counsellor invitation delivery, or live feature APIs. Those are scheduled for later phases.
- No public endpoint in this foundation should be treated as proof of user identity.
- Do not expose the database URL or credentials to the mobile app.
- CORS is not an authentication mechanism. Native mobile clients can omit an Origin header, so every future protected endpoint must use backend authentication and authorization.
- The current schema is a foundation and will evolve through reviewed migrations.
- Do not place NIN values, passwords, access tokens or private counselling message bodies in logs.
- Do not seed real people or sensitive data.

## Notes about the current schema

The `role` field is a foundational representation, not the complete permission model. Phase 3 will implement server-side role enforcement and account lifecycle rules. The five-active-discussion cap must be enforced transactionally in the counselling service when that phase is implemented; a database schema alone does not enforce that business rule.
