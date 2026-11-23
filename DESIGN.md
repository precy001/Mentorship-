# Mentorship+: design decisions for this update

This covers the engineering decisions behind the five changes in this update: admin-only counsellor invitations,
message receipts (sent, delivered, seen), conversation sounds, the News & updates feed, and the Policy & Guidelines
screen. Each section gives the decision, why it was made, what was traded off, and when to revisit it.

## Context and constraints

- **Stack:** an Expo SDK 57 app (Android APK and iPhone), plus a NestJS and Prisma API on Render with PostgreSQL.
  Updates reach testers over the air (`eas update`, runtime version = app version `1.0.0`).
- **Constraints that shaped the choices:**
  - The Render instance can sleep, and there is no push-notification service yet.
  - Testers run APKs built before this update, and old and new app versions will run side by side for a while.
  - The team is small, so every moving part has to earn its place.
- **Principles applied throughout:**
  - **Backward compatibility in both directions.** Old apps work with the new API, and the new app works with the
    old API.
  - **Additive, idempotent migrations.** Nothing is dropped, and every migration is safe to run twice.
  - **Least privilege.** Each action is allowed only for the roles that need it.
  - **Idempotent writes.** A retried request never creates a duplicate.
  - **One source of truth per piece of state.**
  - **Graceful degradation.** A missing capability makes a feature quieter, never crashes it.
  - **Privacy by default.**

---

## ADR-1: Only administrators can invite counsellors

**Decision.** Counsellor invitations, by email or WhatsApp, are created by administrators only. The WhatsApp option
now lives in Admin → Accounts → Invite a counsellor, next to email, and is removed from the counsellor workspace.

**Why.** Choosing who counsels members is a safeguarding decision. It belongs with the people accountable for it.
Because the admin picks the topics when inviting, an admin invitation is approved at creation, and whoever accepts it
becomes a counsellor straight away. The earlier counsellor-invites-counsellor flow needed a second approval step;
this removes it.

**How it is enforced.**
- The route `POST /admin/counsellors/invitations/whatsapp` now inherits the controller's `ADMIN`/`SUPER_ADMIN` role
  guard.
- The service also refuses non-admins (defence in depth: a future routing mistake still can't open it up).
- A test asserts the route's role metadata.

**Compatibility.**
- **Legacy invitations.** Migration `20261124090200_admin_only_counsellor_invites` expires any counsellor-shared
  invitation nobody has accepted yet, so its link shows "expired". It doesn't delete any rows; they stay for the
  audit trail.
- **Pending requests.** Requests that were already accepted still show in Admin → Counselling → Counsellor requests,
  until an admin approves or declines them. The section only appears while such requests exist, and new
  invitations never create one.
- **Old app versions.** If an old app's counsellor card is used, it now gets a clear "Only administrators can invite
  counsellors."

**Alternatives considered.**
- *Keep counsellor invitations behind approval.* Rejected: the product direction is admin-only.
- *Delete the approval endpoints.* Rejected: accepted requests would be stranded with no way to decide them.

**Code structure.** The admin's invite form is now one component (`InviteCounsellorCard`) with an Email / WhatsApp
switch, instead of inline state in the 1,000-line admin screen. The message text and the WhatsApp link are pure
functions in `src/lib/invitation.ts`, with unit tests.

---

## ADR-2: Message receipts (sent, delivered, seen)

### Meaning of each state

| Tick | State | Meaning |
|---|---|---|
| clock | Sending | Shown on this phone, not yet saved by the server |
| ✓ | Sent | Saved on the server |
| ✓✓ grey | Delivered | An app on the other side has received it |
| ✓✓ blue | Seen | Someone on the other side has had the conversation open on screen |
| red ! | Not sent | Failed; tap to try again or delete |

A conversation has **two sides**: the member who started it, and the staff answering it (the assigned counsellor, or
an administrator who steps in). A message is delivered or seen when the *other side* receives or opens it.

**Administrators never generate receipts.** Oversight is not a read: an admin reviewing a conversation must not tell
the member their message was "seen".

### Data model: two timestamps on the message

`DiscussionMessage` gains `deliveredAt` and `readAt` (both nullable), plus `clientId` (see "Safe retries" below).

- **Why not a per-recipient receipts table?** Conversations are one-to-one: a member and their assigned counsellor.
  Two columns answer every question the app asks, with no joins and no extra table to keep consistent.
- **Revisit when:** group conversations, or several counsellors active on one discussion, become a feature. Then
  move to `MessageReceipt(messageId, userId, deliveredAt, readAt)`. The API response shape can stay the same.

### Receipts are explicit writes, not side effects of reading

- **Seen:** `POST /discussions/:id/read`. The app calls it only while the conversation is on screen, the app is in
  the foreground, and there is something unseen from the other side.
- **Delivered:** `POST /discussions/delivered`. The app calls it on its existing 45-second check-in and whenever it
  returns to the foreground. No new timer was added.
- **`GET` stays safe.** Loading a conversation in the background, retrying a request, or an admin viewing it never
  sends a false receipt.
- **Both writes are idempotent.** A timestamp, once set, is never overwritten. Seen also fills in delivered if that
  was still empty.

### Cost

- **Delivered ack:** one indexed query to find conversations with undelivered messages. If there are none, nothing
  is written (the normal case). Otherwise, one `UPDATE`.
- **Seen:** two `UPDATE`s in a transaction, and only when there is something unseen.

### Existing messages

The receipts migration backfills from evidence. A message the other side has already replied to was evidently seen,
so it is marked delivered and seen at the time of that first reply. Messages nobody has replied to yet stay "sent"
until the other side opens the conversation. This was checked on PostgreSQL with sample data.

### Safe retries (idempotent sends)

Sending is now optimistic: the message appears at once with a clock. Mobile networks drop responses, so the app must
be able to retry, and a retry must not duplicate the message.

- The app makes a `clientId` for each message.
- The database enforces `UNIQUE (authorId, clientId)`. NULLs are distinct in PostgreSQL, so older apps that send no
  `clientId` are unaffected.
- **A retry returns the copy already saved.** If two retries race, the unique index lets one through; the other
  catches error `P2002` and returns the saved copy.
- **Order is kept.** Sends from one phone go out through a queue, one at a time, in the order they were written.
- **Older APIs still work.** If the server doesn't know `clientId` yet (old API), the app retries once without it and
  remembers that, so sending never breaks during a staggered deploy.

### Polling, not WebSockets (for now)

The conversation is checked every **4 seconds for two minutes after anyone writes**, then every **15 seconds**. It's
only checked while the conversation is on screen and the app is in the foreground, and straight away when the app
returns.

- **Load:** one active conversation is about 0.5 requests per second for two minutes, then about 0.13 per second. A
  check that brings nothing new doesn't re-render the screen (it compares a signature of messages and receipts).
- **Why not WebSockets or SSE yet?**
  - Render's free instance sleeps, and long-lived connections keep it awake.
  - Sockets need their own authentication, reconnection, back-off and offline handling.
  - Running more than one API instance would need a pub/sub layer (for example Redis).
  - That is a lot of new moving parts for today's traffic.
- **Revisit when** there are roughly 50 or more concurrent active conversations, or features that need presence (a
  typing indicator, "online"). The receipt model doesn't change: the same timestamps would simply be pushed instead
  of polled.

### Limitations

- **Delivered needs the app to be opened.** Without push notifications, a message reaches a phone only when its app
  checks in. When push is added, the notification handler can send the delivered acknowledgement, and ticks will go
  grey while the app is closed, as on WhatsApp.
- **Read receipts can't be turned off yet.** WhatsApp allows this. It could be a per-user setting later.

---

## ADR-3: Conversation sounds

**Decision.**
- Two short **original** sounds, synthesized for Mentorship+ (`assets/sounds`, 7 KB and 9.5 KB WAV): a water-drop
  "bloop" when your message is sent, and a softer two-note pop when a reply arrives while the conversation is open.
- WhatsApp's own sound is not used: it's their copyrighted asset.

**Library.**
- `expo-audio` is Expo's official audio module; React Native has no built-in way to play a sound.
- The version (`~57.0.5`) comes from the SDK's own compatibility list (`expo/bundledNativeModules.json`). That is
  exactly what `npx expo install` would choose.

**Behaviour.**
- **The sent sound plays when the server confirms the message, not on tap**, so the sound means "sent", as on
  WhatsApp.
- **The incoming sound plays only for new messages** from the other side while the conversation is open and in the
  foreground. It never plays for your own messages, or for history when the conversation first loads.
- **Silent and vibrate are respected** on both iPhone and Android (`playsInSilentMode: false`).
- **Sounds never pause the person's music or a call** (`interruptionMode: "mixWithOthers"`).
- **A speaker button in the conversation turns sounds on or off.** The choice is saved on the phone.

**Over-the-air safety.** `expo-audio` is native code. APKs built before this update don't contain it, but they will
receive this JavaScript over the air. So the module is loaded lazily, inside a `try`, on the first sound. On an
older APK that load fails once, is remembered, and the app stays silent instead of crashing. The compiled bundle was
checked to confirm the require sits inside the guarded function. **Sounds need a new APK build;** everything else in
this update works over the air.

**Permissions.** The `expo-audio` config plugin is registered with background playback **off**. That avoids Android
foreground-service permissions (and the Play Console declaration they require) and iOS background audio. Recording
on Android is off. An iOS microphone purpose string is included only because App Store upload checks require one
for any app that links the audio module. The app never asks for the microphone.

---

## ADR-4: News & updates feed

**Decision.**
- Administrators write posts in Admin → News. Each post has a title, text, an optional picture and an optional
  "Read more" link. It can be pinned (up to 3), saved as a draft, unpublished or deleted.
- Everyone who is signed in (members, counsellors and admins) sees the same feed:
  - a "News & updates" section on member Home and the counsellor workspace, showing the latest 3;
  - a full News screen with older posts;
  - a page for each post, with Share.

**Pull, not fan-out.** A post is one row, read on demand. The alternative, writing a notification row per user per
post, costs O(users) writes per post, has to be cleaned up when a post is edited or deleted, and floods the
Notifications screen. The "New" labels come from the newest post date each person has seen, kept on their phone
per account.

- **Trade-off:** "New" doesn't sync across devices.
- **When push notifications arrive:** add an optional "Notify everyone" checkbox for important posts.

**API shape.**
- A separate `NewsModule` (API) and `AdminNewsPanel` / `NewsCard` / `src/lib/news.ts` (app), rather than more code
  in the admin service and admin screen, which are already very large.
- `GET /news` is cursor-paginated. Order is pinned first, then newest, with `id` as the tie-breaker so pages never
  skip or repeat a post. A cursor is used instead of an offset because new posts don't shift the pages.
- `publishedAt` is stamped the first time a post is published. Unpublishing and republishing keeps the original
  date, so fixing a typo doesn't push an old post back to the top.

**Rules and safeguards.**
- **The pin limit is enforced on the server.** The form also warns, but the server rule is what counts.
- **Pictures must be uploaded through Mentorship+**, with the same check as other content, so no images are
  hot-linked from elsewhere.
- **The public feed says "Mentorship+ team".** The admin list still shows who wrote each post, for accountability.
- **Every change is in the audit log.**

**App state.** The app keeps one shared copy of the feed for every screen that shows it, outside AppContext because
it has its own life cycle (pages, a one-minute freshness window, the "seen" marker). It resets when a different
person signs in. A server without the feed (404, before the API is deployed) shows "No updates yet" rather than an
error.

**Not added yet:** targeting posts to groups. The audience fields used by resources and grants can be added later if
needed.

---

## ADR-5: Policy & Guidelines

- A screen with intentionally no content yet: "Coming soon".
- It's linked from member Profile, the counsellor workspace and Admin → Platform.
- The route is public (it works signed out), so it can later be linked from registration.
- **Recommendation:** when the text is ready, serve it from the API, so legal wording can change without an app
  release.

---

## Compatibility matrix

| | Old API (before this update) | New API |
|---|---|---|
| **Old app** (current APKs, current JS) | Works as today | Works. New response fields are ignored and the new endpoints are additive. The counsellor WhatsApp card now gets "only administrators" |
| **New JS on an old APK** (over-the-air) | Works. No ticks beyond ✓ (receipt calls return 404 and are ignored), "No updates yet", sends without `clientId`, no sound | Everything except sound |
| **New APK** | As the row above | Everything |

**Deploy order:** API and migrations first, then `eas update`, then a new APK (`eas build`) for sounds.

---

## What was verified

**Automated tests and checks:**
- **API:** 126 tests pass, 25 of them new. They cover receipts and sides, idempotent sends including the race, news
  ordering, pagination, pin limit, publish dates and permissions, and admin-only invitations including the route's
  role metadata.
- **App:** 35 unit tests pass, 18 of them new (receipt logic, news feed logic, invitation text).
- **Type checks:** `tsc --noEmit` is clean for the app and the API, and ESLint is clean for the changed API files.
- **Migrations:** applied to PostgreSQL (in-process) with realistic data already in place, and each one run twice.
  The checks covered the backfill result, duplicate `clientId` refused, NULL ids allowed, the news foreign key,
  feed order, and invitation expiry.

**Real screens against a mocked API** (web build of the actual screens):
- ticks: seen, delivered, sent, sending and not sent;
- retry and delete of a failed message, and "Message info";
- the sound toggle;
- the news feed, "New" labels and a single post;
- the admin News panel;
- both admin invitation paths, including the exact WhatsApp link opened;
- the counsellor workspace without the invite card;
- Policy & Guidelines.

The checks also recorded which receipt calls each role makes: the member's and counsellor's apps acknowledge, the
admin's never does.

**Native bundles:** exported for Android and iOS. Both sounds are included in the over-the-air bundle.

**Not verified here** (needs real devices and the live server):
- sound playback on a phone;
- opening real WhatsApp;
- the Render deploy;
- ticks between two real phones.
