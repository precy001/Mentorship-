# Service areas fix — CHANGELOG

## Root cause
The LGA/LCDA list existed only in `api/prisma/seed.ts`, which is run by hand. It is not part of `prisma migrate deploy`, so any database that was migrated but never seeded has an empty `ServiceArea` table. The registration screen correctly asked the backend, got no rows, and showed "No areas available yet".

## Added files
| File | Purpose |
|---|---|
| `api/prisma/migrations/20261114120000_restore_service_areas/migration.sql` | Restores all 37 original Lagos LGA/LCDA records on `migrate deploy`. `INSERT … ON CONFLICT DO NOTHING`: repeatable, never overwrites or deletes, keeps admin edits and enable/disable choices |
| `api/prisma/data/service-areas.ts` | The original list in one place (shared by the seed and checked against the migration by a test) |
| `api/src/service-areas/service-areas.service.ts`, `.dto.ts`, `.module.ts` | Single backend service: active LGAs, LCDAs of one LGA, registration validation, admin create/edit/enable/disable/rename/delete |
| `api/test/service-areas.data.spec.ts`, `service-areas.service.spec.ts`, `auth-register-area.spec.ts` | New tests |

## Modified files
| File | Change |
|---|---|
| `api/prisma/seed.ts` | Uses the shared list; still upserts with `update: {}` (never changes existing rows) |
| `api/src/membership/membership.controller.ts`, `membership.module.ts` | New `GET /membership/lgas` and `GET /membership/lcdas?state=&lga=` (active only). `GET /membership/locations` kept unchanged for compatibility |
| `api/src/auth/auth.service.ts`, `auth.module.ts`, `dto/register.dto.ts` | State, LGA and LCDA are now required and checked against an *active* area; the stored canonical values are saved |
| `api/src/admin/admin.controller.ts`, `admin.service.ts`, `admin.module.ts` | New: `POST /admin/service-areas`, `PUT /admin/service-areas/:id`, `DELETE /admin/service-areas/:id` (disabled areas only), `PATCH /admin/service-areas/lga/active`, `PUT /admin/service-areas/lga` (rename). Existing list and per-area active endpoints unchanged. All audited, ADMIN/SUPER_ADMIN only |
| `api/test/admin-content.service.spec.ts` | Constructor updated for the new dependency |
| `src/lib/api.ts` | New client functions for the endpoints above |
| `app/register-lga.tsx` | Fetches LGAs, then only the chosen LGA's LCDAs; loading, empty, error and retry states for both; refetches on screen focus; ignores stale responses. Layout and flow unchanged |
| `app/(admin)/index.tsx` | Service Areas section: grouped by LGA, add LCDA / new LGA, edit, rename LGA, enable/disable one or all, delete (disabled only), validation, confirmations, feedback |

## Database
One additive data migration, no schema change:
```
npm run api:db:migrate
```
No dependencies were added or changed.
