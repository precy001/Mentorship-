# Mentorship+ UI/UX upgrade: changelog

Scope: presentation only. No backend, database, API client, context, routing, or `package.json` changes.
Every API call, handler, route and role guard is preserved. Real data is still used everywhere.

## Shared foundation

| File | Changes |
|---|---|
| `src/lib/theme.ts` | Added (nothing removed): `type` scale, `shadows`, `layout` constants and extra colour tokens (`placeholder`, `brandSurface`, `onDark`, `mint`, ...). |
| `src/lib/format.ts` (**new**) | Shared date/time formatting (`Mon, 16 Nov · 10:00 am`), `humanize` for enum values, `pluralize`, and status-to-colour helpers for discussions, appointments and availability. Replaces raw `toLocaleString()` and `REPLACE_UNDERSCORE` strings. |
| `src/components/UI.tsx` | Existing exports kept with the same props. `Screen` now respects the status bar / notch, centres content on tablets and web (max 640pt), reserves room for the tab bar and supports pull-to-refresh. `Button` gains `size`, `icon`, `grow`, `style` and a `dangerSoft` variant. `Field` gains a focus ring, leading icon and show/hide password. New shared components: `BackLink`, `SectionHeader`, `HeroCard`, `PressableCard`, `ListRow`/`ListGroup`, `InfoRow`, `StatTile`, `Chip`, `OptionCard`, `Segmented`, `StarRating`, `Avatar`, `IconBadge`, `EmptyState`, `ErrorState`, `LoadingBlock`, `SearchField`, `StepProgress`, `ButtonRow`, `Divider`. |
| `src/components/Forms.tsx` | `DatePickerField` gets `defaultView` and `descendingYears` (needed for date of birth). 44pt nav, year and sheet buttons. Better placeholder / disabled-day contrast. |
| `src/components/ContentCards.tsx` | Save button is a 44pt target with selected state announced. Scholarship deadline gets an icon. Stronger text strip on featured banners. |

## Screens

| File | Improvements |
|---|---|
| `app/index.tsx` (Welcome) | No more flash of "Get started" buttons while a saved session is restored (shows progress instead). Respects the system Reduce Motion setting. Footer text contrast fixed. Safe-area padding. |
| `app/auth.tsx` | Labelled fields with icons, show/hide password, inline validation, keyboard "Go" submits. Sign in / Create account segmented switch. Sign-up mode explains the registration steps instead of an empty card. 44pt links. |
| `app/forgot-password.tsx`, `reset-password.tsx`, `verify.tsx` | Same header pattern, labelled fields, inline errors, keyboard submit, accessible back control. |
| `app/counsellor-invite.tsx` | Clear rules list, visible missing-token warning, accessible back control. |
| `app/register-lga.tsx` | Step progress bar. LCDA options expand directly under the chosen LGA (no more scrolling to find them). Search appears when there are many LGAs. Retry on load failure. Radio / checkbox semantics and 48pt rows. |
| `app/register-biodata.tsx` | Removed the nested `ScrollView`. The date-of-birth picker now has a year selector (previously one month per tap, about 400 taps to reach 1990). Every field has a visible label and inline error. Category choices are large radio cards. Retry for categories. "Change" link for location. Alerts and API payload unchanged. |
| `app/(student)/_layout.tsx` | Tab bar clears the home indicator, filled icon for the active tab, darker inactive colour for contrast, hides on keyboard, accessibility labels. |
| `app/(student)/index.tsx` (Home) | Time-of-day greeting, profile avatar shortcut, unread count on the bell, empty goals state with an action, odd quick action fills the row, appointments as tappable rows with date and status, "See all" links, pull-to-refresh. |
| `app/(student)/explore.tsx` | Segmented Resources / Scholarships with counts, shared search field, 44pt filter chips aligned to the screen edge, result count, loading / error / empty states, clear-filters action, deep-link tab sync, pull-to-refresh. |
| `app/(student)/counselling.tsx` | Topic chips are accessible radios. Title / message limits match the server (4-180 / 5000) with inline errors. Status colours (completed is no longer red). Whole-card tap targets. Loading, error and empty states. |
| `app/(student)/activities.tsx` | Emoji glyph icons replaced with real icons. Seven items grouped under Grow / Look after yourself / Keep track as list rows. |
| `app/(student)/profile.tsx` | Avatar with camera badge, grouped identity rows, membership chips with "Current" summary, Save disabled until something changes, activity stat tiles, grouped navigation rows, soft-danger Log out. |
| `app/feature/[slug].tsx` | Back control and consistent cards on every sub-screen. Booking: topic radio cards, time chips, formatted ranges. Assessment: option cards. Wellbeing: mood chips with icons. Goals: real checkboxes. Notifications: clear unread styling. History: readable labels. Accessible 5-star ratings. Empty states throughout. |
| `app/discussion/[id].tsx` | Chat bubbles with timestamps and counsellor marker. Composer pinned above the keyboard. Auto-scroll to newest message. Close / cancel moved to the header card (away from Send). Accessible star rating. Fixed duplicated "Rating submitted" pill. |
| `app/(counsellor)/index.tsx` | Header with avatar and sign-out, stat tiles, availability as a clear current-state selector (capacity rule kept), active discussions listed first, appointment actions with per-item loading, pull-to-refresh. Removed a duplicate role-guard effect (behaviour identical). |
| `app/(admin)/index.tsx` | One 700-line scroll split into six tabs (Overview, Accounts, Counselling, Resources, Scholarships, Platform) with a badge for items needing attention. Overview has icon stat tiles and a "needs attention" card. Account cards show an avatar. Suspend / Deactivate / Reject use a softer destructive style. All forms, handlers and confirmations are the original code. |

## Small behaviour differences (all UI-level)

- Register: "Complete registration" is no longer greyed out when no category is chosen. It validates and highlights the field instead.
- Profile: "Save membership changes" is disabled until the selection differs from the current one.
- Counselling: titles shorter than 4 characters are caught on the device (the server already required 4).
- Counsellor: tapping Available at the 5-discussion limit shows an explanation (previously the button was silently disabled).
