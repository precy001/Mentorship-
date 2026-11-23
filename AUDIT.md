# Mentorship+ audit — 23 November 2026

Scope: the mobile app (member, counsellor and admin) and the NestJS API in this repository. The review was done
by reading the code and running the type checks, unit tests, API build and app bundles. Nothing was tested on a
physical phone, so please run the checklist in README-OVERLAY.md on Android and iPhone.

## Reported issues (fixed)

| Issue | Cause | Fix |
|---|---|---|
| Logged a mood, but it didn't update on my insights | The Profile tab counted check-ins once, the first time it opened. Tabs stay loaded, so the count never refreshed. The wellbeing screen kept a separate copy. | Check-ins now live in shared app state. Saving one updates the wellbeing screen, the profile count and the home screen at once. Added a **Your week** insights card: a 7-day mood strip, check-ins this week, day streak, most common mood and a week-on-week comparison. |
| Bottom tab bar: content visible behind it | The tab bar floated above the page and was semi-transparent, so photos showed through and around it (very visible on Android). | Solid white bar, docked to the bottom edge with a hairline border. Page content now stops above it. |
| Grants missing; need to choose who each item is for | There was no grants type and no audience targeting. | New **Grants** content type (admin + Explore + Home + saved items). Every resource, scholarship and grant now has **Who is this for?**: *Everyone* or chosen membership categories/subcategories. Defaults: Resources → Everyone, Scholarships → Education & Learning (students), Grants → Work & Career (working members). Existing scholarships were set to students. 5 clearly-labelled placeholder grants were added. |
| NIN field on the profile, required, no confirm button | — | Required 11-digit NIN at registration and on the member profile. No verification step. Members who registered before this see a prompt on Home and Profile until they add it. Stored privately in the profile, never shown to other members, never written to audit logs. |

## Improvements made in this round

1. **A page for every item.** Tapping a resource, scholarship or grant opens a full page with the complete text,
   deadline, eligibility, an **Apply on the official site** button (when a link is set), Save, Share and a
   "Talk to a counsellor" shortcut. Previously, Home cards opened a generic list instead of the item.
2. **Official links for scholarships and grants.** Admins can add an optional link; it is validated (https only).
3. **Conversations update on their own.** An open discussion checks for new messages every 15 seconds and when
   the app returns to the foreground; pull down to refresh at any time. The Support tab and the counsellor inbox
   refresh quietly whenever they are shown again.
4. **Tappable notifications.** For members, discussion and appointment notifications now open the right screen.
5. **Wellbeing support prompt.** After a "Low" or "Stressed" check-in (or a run of them), members see a gentle
   card offering a counsellor, with the emergency-number reminder.
6. **More appointment times.** 7 time slots instead of 3 (9:00 AM to 5:00 PM).
7. **Targeted Home and Explore.** Members only see items meant for their group. Empty states explain why and link
   to the membership category setting. Working members get a "Grants" shortcut and a "Grants for you" section.
8. **Privacy.** Wellbeing journal notes are no longer kept in device storage; they're always loaded from the account.
9. **Help & FAQ** updated (NIN, and why some grants or scholarships aren't shown).

## Found, not changed — recommended next steps

| Priority | Finding | Recommendation |
|---|---|---|
| High | **Deployment order matters.** The API rejects fields it doesn't know (`forbidNonWhitelisted`). An app update that sends new fields (like NIN) to an older API fails with "property … should not exist". | Always deploy the API and run migrations **before** publishing an app update. README-OVERLAY.md lists the order. |
| High | **No phone push notifications.** Members and counsellors only see notifications while the app is open. | Add `expo-notifications`, store device push tokens in the API and send pushes for new discussions, replies and appointment changes. Needs a new native build. |
| Medium | **A brand-new database can't be built from the migrations.** `20261113130000_phase5_admin_platform` re-creates tables already created by `20261113120000_phase5_activity_records`, so `prisma migrate deploy` fails on an empty database. Production is unaffected because those migrations already ran there. | Baseline the migration history so staging or a fresh environment can be created. Test against a copy first. |
| Medium | **The API's `package-lock.json` is out of sync** with `package.json` (`npm ci` fails: missing webpack 5.113). | Run `npm install` inside `api/` and commit the updated lock file, so builds are repeatable. |
| Medium | **Slow first requests after idle.** If the API is on Render's free plan, the first request after a quiet period can take close to a minute (sign-in, verification). | Use an always-on instance, or schedule a health-check ping. |
| Medium | **Suspensions are silent and indefinite.** The counsellor gets no reason or notice, and there is no end date. | Add a reason, an optional end date with automatic reinstatement, and an email to the counsellor. |
| Medium | **NIN is collected but not verified or unique.** Two accounts can enter the same NIN. Admins can't see it. | If verification is needed, call a licensed provider (e.g. Monnify ₦60/check) from the API. Decide whether NIN should be unique and whether admins need to see it. |
| Medium | **No alerts when new opportunities match a member.** | Send an in-app (later push) notification to the targeted group when a grant or scholarship is published. |
| Low | **Goals can't be edited or deleted.** | Add edit/delete on the Personal goals screen. |
| Low | **The admin dashboard is one ~1,000-line screen.** | Split it into one file per section to make future changes safer. |
| Low | **No automated end-to-end tests.** Only unit tests exist. | Add a small Maestro or Detox suite for registration → verify link → sign in → dashboard. These are the flows that broke recently. |
| Low | **University directory is a placeholder screen.** | Connect real data or remove the route. |
