# Mentorship+ audit report

**Method and limits.** The sandbox had no network access, so `npm install` was impossible. Therefore **`npx tsc --noEmit`, `npm run api:build`, `npm run api:test`, `prisma validate/generate/migrate`, the seed against a real database, and the app itself were NOT run.** What was executed: a TypeScript *syntax* parse of all 44 changed/new `.ts/.tsx` files (0 errors) and a runtime check of the starter-content data against the admin validation rules (all items valid, unique keys). Everything else below is code-inspection and is labelled as such. Treat "PASS (inspection)" as "looks right", not "tested".

## Phase 4 — Registration & Profiles
| Requirement | Result | Evidence |
|---|---|---|
| Registration + email verification | PASS (inspection) | Active area/category validated server-side, bcrypt-12, hashed 24 h single-use tokens, resend endpoint. |
| Login, logout, recovery | PASS (inspection) | Verified/active checks; reset tokens hashed, 30 min. Logout was device-only; now revokes server session. |
| Session restoration | **FAIL → fixed** | Access token lasted 15 min with no refresh, so reopening the app later signed people out. Added rotating refresh sessions + silent renewal. |
| Six membership categories | **FAIL — needs your input** | Only **two** categories exist anywhere in the repo (Education & Learning, Work & Career). The other four are not defined, so none were invented. Send me their names and subcategories (or add them to `seed.ts`; seeding upserts safely). |
| Category-specific dashboards | PASS (inspection) for the two existing categories | Home content keys off category/subcategory slug. |
| Profile viewing / editing | **FAIL → fixed** | No endpoint edited name, phone, DOB or school; LGA/State always showed "Not provided" (never mapped). Added `PATCH /profile`, editable UI, correct mapping. |
| Profile picture upload/display | PASS (inspection) | Type/size validated, stored through the shared storage service. |
| Account isolation | PASS (inspection) | Every list/read is scoped by user id or role; discussion access checks creator/assignee/admin. |
| Input validation / demo data removal | **PARTIAL → fixed** | `src/data/seed.ts` is empty. A "Verify NIN" button that could never work (no NIN field exists) was removed. Counsellor availability body was unvalidated; now validated. |

## Phase 5 — Counsellor management
| Requirement | Result | Evidence |
|---|---|---|
| Super Admin / admin appointment, role rules | PASS (inspection) | Only SUPER_ADMIN can appoint/alter admins; self-change blocked. |
| Invitations & account management | PASS (inspection) | Hashed 7-day tokens, email must match, atomic acceptance. |
| Topic assignment & restricted feeds | PASS (inspection) | Feed = discussions assigned to that counsellor only. |
| Max 5 active discussions; Available/Busy | PASS (inspection) | Enforced at assignment and on availability change. |
| Assignment by topic/availability | **PARTIAL → fixed** | Discussions with no available counsellor stayed OPEN until an admin pressed auto-assign. They are now assigned automatically (oldest first, respecting topic and the limit) when a counsellor becomes available, frees a slot, or gains a topic. |
| Appointment-aware availability | PASS (inspection) | Overlap check per counsellor at booking and now at reschedule. |
| Ratings & moderation | PASS (inspection); hardened | Moderation + average update are now one transaction. |
| Permissions | **FAIL → fixed** | `PATCH /discussions/counsellor/availability` accepted any enum value (e.g. SUSPENDED). |

## Phase 6 — Discussions & Appointments (completed)
Reschedule added (`RESCHEDULED` was unreachable before). Rule: the person who proposes a time cannot approve it; the other party confirms or cancels. Added member double-booking check, refusal to confirm a past time, race-safe status updates, Serializable transactions with a friendly 409 on conflict. Complete/no-show remain restricted to confirmed appointments after their start time. Mobile: members and counsellors can reschedule and confirm. Discussion create/assign/status/queue covered above.

## Phase 7 — Notifications (completed)
Existing: discussion and appointment events. Added: welcome on verification, appointment requested/rescheduled/updated for both sides, queue assignment, reassignment warning to members, counsellor role/invitation events, rating published. New API: paged history, unread count, mark one/all read. App: server unread badge, 45-second foreground polling plus refresh on resume, history with "Load earlier", "Mark all as read", and a bell for counsellors (they previously had no way to see notifications). **Not implemented: push notifications** (no push provider/credentials in the project); delivery is in-app.

## Phase 8 — Security & integrity
- **No secrets in the app:** grep of `app/`, `src/`, `app.json`, `eas.json` found no Supabase or service-role references; they exist only in `api/`. PASS.
- Added rate limiting (in-memory, per instance), refresh-token rotation with reuse detection, session revocation on password reset, unvalidated body fixed, `trust proxy`. Upload size/type validation already existed. Role guards on admin and ratings routes verified.
- Remaining: rate limiter is per API instance (use a shared store if you scale out); JWT secret strength is enforced (≥32 chars) already.

## Starter content & first-run (completed)
12 original resources (career, business, finance, study, wellbeing, goals) and 5 scholarship listings (Chevening, Commonwealth, Fulbright, Mastercard Foundation Scholars, Nigerian Federal awards) seeded through the database and served by the existing APIs; all editable/unpublishable in Admin. **Scholarship facts are general and hedged from my knowledge, and deadlines are placeholders — verify and replace them before launch.** Images: nine original generated illustrations as fallback art (admin uploads override). Cards now expand to show the full text (descriptions were previously cut at 3 lines with no way to read more). One-time welcome uses the member's name and category, and is stored server-side. No fake users or statistics.

## Splash
Rebuilt with your `1029.jpg`. You uploaded two images but described one reference; I used the student photo for the splash and the mentor photo for the welcome sheet. Confirm you hold the licence for both. The native (pre-JS) splash was not changed because `expo-splash-screen` is not in `package.json` and could not be installed here.

## Needs a device / real services
Splash on small and tall Android phones; welcome sheet; avatar upload; refresh-session after >15 min idle; polling and badge; reschedule round-trip between a member and counsellor account; email delivery (Brevo); end-to-end flows against your Render + Supabase deployment; accessibility with TalkBack.

## Known remaining issues
Four membership categories undefined (above); no push notifications; admin has no manual "assign to a chosen counsellor" screen (auto-assign only); University directory remains an honest "not connected" placeholder; `src/data/seed.ts` is dead code.
