# Changelog: sign-in, verification-link and dashboard fixes

## What was wrong

1. **Blank screen after signing in (Android).** Two parts of the app navigated at the same moment after sign-in.
   The splash screen, still mounted underneath the sign-in screen, redirected to the dashboard as soon as the user
   was set. The sign-in screen then redirected again once its data finished loading. On Android these overlapping
   transitions could leave the screen blank. Restarting worked because a restored session only navigates once.
2. **Admin dashboard appearing twice (iPhone).** The same double navigation. The second redirect targeted the admin
   area while it was already open, so Expo Router pushed a second copy of the dashboard on top of the first.
3. **Blank screen after tapping the verification link (Android).** When the link is tapped while the app is still
   in the background (normal right after registering), Android delivers it before the app is back in the
   foreground. Opening a screen at that moment can leave a blank screen.
4. Related: the splash stayed underneath the dashboard. Pressing Android Back from a dashboard returned to a splash
   stuck on "Opening your space…". Signing out also navigated twice (once from the screen and once from its own
   guard).

## Changes

### New
- `app/+native-intent.ts`: holds links that arrive while the app is running until the app is in the foreground
  (plus 300 ms to settle), then opens them. Links that launch the app from closed are not delayed. This covers
  verification, password-reset and counsellor-invite links.
- `src/lib/routes.ts`: small helpers (`homeHrefFor`, `leaveScreen`, `isAdminRole`).

### Modified
- `app/_layout.tsx`: screens are guarded by session state with `Stack.Protected`. Signed-out screens (sign-in,
  welcome, registration, forgot password) exist only when signed out. Each role's home exists only for that role.
  Discussion and feature screens need a session. Email-link screens are always available. When the session
  changes, the stack swaps to the right screens in one step:
  - sign-in and session restore go straight to the role's home, with nothing underneath;
  - sign-out goes to the sign-in screen.
- `app/auth.tsx`: no longer navigates after sign-in. The Back link only shows when there is a screen to go back to.
- `app/index.tsx`: the splash no longer redirects on its own. The design is unchanged.
- `app/(admin)/index.tsx`, `app/(counsellor)/index.tsx`: removed the redirect effects that competed with
  navigation. Sign-out no longer navigates manually.
- `app/(student)/profile.tsx`: log-out no longer navigates manually.
- `app/verify.tsx`: progress ("Confirming your email…") and the result are shown on the screen instead of pop-ups,
  with a **Continue to sign in** button. Back works even when the app was opened straight from the link.
- `app/reset-password.tsx`, `app/counsellor-invite.tsx`: Back and Continue work when the app was opened straight
  from the link, and when someone is already signed in.
- `src/components/WelcomeGate.tsx`: the first-time welcome sheet opens only after the person is on their dashboard
  and the transition has finished, not over the sign-in screen mid-transition.

### Behaviour notes
- After signing in, the dashboard is the first screen. Android Back now leaves the app instead of returning to the
  splash.
- Accepting a counsellor invitation after signing in from the invitation screen now returns to the invitation,
  so it can be accepted straight away.

### Not changed
API, `AppContext`, `app.json`, `package.json` (no new dependencies), the splash design, and all other screens.

## Checks run
- `npx tsc --noEmit`: passes, including with Expo Router's strict typed routes generated.
- `npx expo config --type public`: passes.
- `npx expo export --platform android` and `--platform ios`: both bundle. `+native-intent.ts` and `routes.ts` are
  included.
- Router simulation of sign-in, session restore and sign-out with Expo Router's own stack router: each lands on a
  single correct screen.
- Link handler with a mocked app state: links are held while in the background and opened about 300 ms after
  returning to the foreground.
- Not yet tested on a real Android or iOS device.
