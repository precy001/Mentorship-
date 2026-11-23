# Changelog — grants, audience targeting, NIN, insights fix and UX improvements

## API (`api/`)
- **New `Grant` model** (`prisma/schema.prisma`) with optional amount, optional deadline (open all year), eligibility,
  description, optional official link, image and audience.
- **Audience fields** `audienceCategories` / `audienceSubcategories` (membership slugs; both empty = everyone) on
  `Resource`, `Scholarship` and `Grant`. Scholarships also get an optional `applyUrl`.
- **Migration `20261123120000_grants_and_audience`** (additive only): adds the columns and the `Grant` table, sets
  existing scholarships to Education & Learning, and inserts 5 placeholder grants (labelled "placeholder listing").
  It is safe to run twice.
- **Endpoints:** `GET /content/grants` (public: open grants, soonest deadline first) and
  `GET|POST /admin/grants`, `PUT|DELETE /admin/grants/:id`, `PATCH /admin/grants/:id/active`.
  The dashboard stats now include `grants`.
- **Audience on create/update** for resources, scholarships and grants. Each group is checked against real
  membership categories and subcategories. If omitted on create, the type's default is used; if omitted on update,
  the audience is unchanged. Older app versions keep working.
- **NIN:** required on registration (exactly 11 digits; spaces and dashes are ignored) and editable on
  `PATCH /profile`, but it can't be cleared. It is stored in the profile data, returned with the member's own
  account, and kept out of audit logs. The shared rules are in `src/common/nin.ts`.
- **Tests:** `test/grants-audience.spec.ts` and `test/nin.spec.ts` (18 new tests; 90 in total, all passing).

## App
- **Mood insights fix:** check-ins are kept in shared state (`AppContext.checkins`, `addCheckin`), so the profile
  count, wellbeing screen and home update immediately. New "Your week" insights (`src/lib/mood.ts`, with unit tests).
  Journal notes are not written to device storage.
- **Tab bar:** a solid, docked bar (`app/(student)/_layout.tsx`). Tab screens' bottom padding was adjusted
  (`src/components/UI.tsx`).
- **Grants:** a Grants tab in Explore, "Grants for you" on Home, a Grants shortcut for Work & Career members,
  saved grants, and `GrantCard`.
- **Audience targeting:** members only see items meant for their group (`src/lib/audience.ts`, applied in
  `AppContext` and Explore).
- **Admin:** a new Grants section; a "Who is this for?" picker (`AudienceField` in `src/components/Forms.tsx`) on
  resources, scholarships and grants; an Official link field on scholarships and grants; the audience shown on each
  listing; and a Published grants tile.
- **Item page:** `app/content/[kind]/[id].tsx` shows the full text, deadline, an Apply button, Save, Share and a
  counsellor shortcut. Home, Explore and Saved cards open it.
- **NIN:** a required field at registration (`app/register-biodata.tsx`) and on the profile, plus a "Complete your
  profile" prompt on Home for members without one.
- **Conversations:** auto-refresh every 15 s while open and when the app returns; pull to refresh.
  The Support tab and counsellor inbox refresh when shown again.
- **Notifications:** tapping a discussion or appointment notification opens the right screen (members).
- **Wellbeing:** a support prompt after low or stressed check-ins.
- **Booking:** 7 time slots.
- **Help & FAQ** text updated.

This overlay also contains the earlier sign-in and verification-link fix files (`app/_layout.tsx`,
`app/+native-intent.ts`, `app/auth.tsx`, `app/verify.tsx`, `src/lib/routes.ts`, etc.). They are included so the
overlay is complete against the project you uploaded. `app/_layout.tsx` gained one line (the new item page), and
`src/lib/routes.ts` gained `openContent`.

## Not changed
`app.json`, `package.json` (no new dependencies), `eas.json`, splash design, authentication flow.
