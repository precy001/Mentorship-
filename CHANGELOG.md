# Mentorship+ — UX, forms, media & functional audit: CHANGELOG

## Added files
| File | Purpose |
|---|---|
| `api/prisma/migrations/20261114090000_content_images/migration.sql` | Adds nullable `imageUrl` to `Resource` and `Scholarship` (additive, no data touched) |
| `api/src/storage/storage.service.ts`, `storage.module.ts`, `image-validation.ts` | The single Supabase Storage integration (extracted from `ProfileService`); magic-byte image validation; best-effort cleanup |
| `api/src/content/content.constants.ts` | Predefined resource categories, scholarship levels, read-time rule |
| `api/src/common/transformers.ts` | `@Trim()` / `@NormalizeEmail()` DTO transformers |
| `api/test/image-validation.spec.ts`, `storage.service.spec.ts`, `admin-content.service.spec.ts`, `admin-content.dto.spec.ts` | New backend tests |
| `src/components/Forms.tsx` | `SelectField` (dropdown), `DatePickerField` (calendar), `ImageUploadField` (pick/preview/replace/remove), `SmartImage` (loading + fallback), `Toast` |
| `src/components/ContentCards.tsx` | Image-supported `ResourceCard`, `ScholarshipCard`, `FeaturedBanner`, `DeadlineBadge` |
| `src/lib/validation.ts` (+ `validation.test.ts`) | Email, phone, integer, date, length, image validators |
| `src/lib/options.ts`, `src/lib/feedback.ts`, `src/lib/imagePicker.ts` | Shared option lists; confirm/toast/error helpers; image picking + validation |

## Replaced files
| File | What changed |
|---|---|
| `api/prisma/schema.prisma` | `imageUrl String? @db.VarChar(2048)` on `Resource` and `Scholarship` |
| `api/src/admin/admin.dto.ts` | Trimmed/validated DTOs; category & level must come from predefined lists; read time 1–180 min; deadline `@IsDateString`; optional `imageUrl`; invite email normalised |
| `api/src/admin/admin.service.ts` | Image upload, `imageUrl` persisted; **new** update + delete for resources and scholarships; future-deadline rule; only platform-uploaded image URLs accepted; old image removed on replace/delete; audit entries |
| `api/src/admin/admin.controller.ts` | New: `POST /admin/uploads/content-image`, `PUT/DELETE /admin/resources/:id`, `PUT/DELETE /admin/scholarships/:id` (all ADMIN/SUPER_ADMIN only) |
| `api/src/admin/admin.module.ts`, `profile/profile.module.ts`, `profile/profile.service.ts` | Use the shared `StorageService` (profile uploads keep the same bucket, path and URL format) |
| `api/src/main.ts`, `common/filters/api-exception.filter.ts` | Validation messages are now returned in production (previously generic "Bad Request"); multi-message join; friendly 413 text |
| `api/src/auth/dto/register.dto.ts` | Phone number format validation |
| `api/.env.example` | Documents `content/` folder in the existing bucket (no new variables) |
| `app/(admin)/index.tsx` | Rewritten forms (dropdowns, date picker, numeric field, inline validation, optional markers), image upload, edit/delete, loading + duplicate-submit lock, success/error feedback, confirmations, empty states, inline load-error banner |
| `app/(student)/explore.tsx`, `app/(student)/index.tsx`, `app/feature/[slug].tsx` | Image cards, featured banner, category filter, retry; appointment date uses a calendar instead of typed text |
| `src/components/UI.tsx` | `Field`: error/required/optional/helper/counter/a11y; `Button`: `loading`; `Screen`: keyboard handling + `scrollRef` (all existing props unchanged) |
| `src/lib/api.ts` | Shared multipart image upload (profile upload delegates to it); new content endpoints/types |
| `src/context/AppContext.tsx` | Resources/scholarships carry `imageUrl`; deadline kept as full ISO (fixes a possible off-by-one date) |

## Database migration
Additive only (`ADD COLUMN IF NOT EXISTS ... NULL`). Run from the project root:
```
npm run api:db:migrate
npm run api:db:generate
```
## Dependencies
None added or changed. Run `npm run api:install` only if `api/node_modules` is missing.
