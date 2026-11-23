# Changelog — back buttons, WhatsApp counsellor invitations, check-your-inbox step, custom dialogs, grants, NIN and more

## Latest additions
### Back button on every screen
- Explore, Support, Activities and Profile now have a Back link (it returns to the previous screen, or Home).
- The sign-in screen always shows Back. When nothing is behind it (after signing out, or when opened from an email
  link), it opens the welcome screen.
- Each admin section (Accounts, Counselling, Resources, Scholarships, Grants, Platform) has "‹ Overview", and Android
  Back on a section returns to the Overview.
- The four starting screens (welcome, member Home, counsellor workspace, admin Overview) have no Back, because there
  is nothing before them. Android Back there leaves the app, as usual.

### Counsellors can invite counsellors on WhatsApp
- The counsellor workspace has a new "Invite a counsellor" card: enter their WhatsApp number (and optionally their
  name), tap **Invite on WhatsApp**, and WhatsApp opens with a ready-written message to that number. Tap Send.
- The message has a private https link (WhatsApp only makes https links tappable). It opens a small Mentorship+ web
  page with an **Open in Mentorship+** button that opens the invitation in the app.
- **Safety:** someone invited by a counsellor becomes a counsellor only after an administrator approves them.
  - Admin → Counselling has a **Counsellor requests** list (also counted under "Needs your attention"), with
    Approve and Decline.
  - Approval gives them the inviting counsellor's topics.
  - Everyone involved gets an in-app notification.
  - Limits: 10 invitations per person per day; invitations expire after 7 days; you can't accept your own.
- After approval, the new counsellor's app switches to the counsellor workspace the next time it's opened. They don't
  need to sign out. The app now reloads the account when it comes back to the foreground, at most once a minute.
- Email invitations from admins work exactly as before. When an emailed invitation is accepted, the app now goes
  straight to the counsellor workspace instead of asking the person to sign in again.
- API: `POST /admin/counsellors/invitations/whatsapp` (counsellors and admins), `GET /admin/counsellors/requests`,
  `POST /admin/counsellors/requests/:id/approve|decline` (admins), and the public page `GET /invite/:token`.
- Migration `20261123190000_counsellor_whatsapp_invites` (additive) extends `CounsellorInvitation`. 11 new API tests
  (101 in total).

### "Check your inbox or Spam" for new accounts
- After registering, people now land on a **Check your inbox** screen. It shows their email address, a clear
  "Can't see it? Check your Spam or Junk folder" box (with Gmail tips), a Resend button (once a minute), Open Mail
  (iPhone), "I've verified — sign in", and "Used the wrong email? Register again".
- Trying to sign in before verifying shows "Verify your email first", with the Spam reminder and a Resend option.
- Every "resend verification" confirmation now also reminds people to check Spam or Junk.

---


## Custom dialogs (latest)
- Every pop-up in the app (all 84 of them: success, errors, warnings, confirmations such as Log out?) now uses one
  Mentorship+ dialog instead of the system alert box. It looks the same on Android and iPhone: icon, title,
  message and rounded buttons.
- Colour and icon follow the event: green tick for success, red for errors, amber for "please check" messages,
  blue question mark for confirmations, and red warning with a red button for destructive actions such as log out
  or delete.
- Buttons keep exactly the same actions as before. Cancel sits on the left (or last when stacked). Android Back
  presses Cancel; tapping outside closes the dialog only where that was allowed before.
- If two messages arrive together, they show one after the other.
- New files: `src/lib/alert.ts` (the `AppAlert.alert(...)` call, same shape as before), `src/components/AlertHost.tsx`
  (the dialog, mounted once in `app/_layout.tsx`) and `src/lib/alert.test.ts`. `src/lib/feedback.ts`
  (confirmations) and every screen that showed a pop-up were switched over. No new dependencies.

This ZIP is cumulative: it also contains everything from the grants/NIN/audit update below.

---


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
