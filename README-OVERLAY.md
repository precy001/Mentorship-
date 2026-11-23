# Overlay: sign-in / verification-link / dashboard fixes

This ZIP contains only new and changed files, at their exact paths inside `mentorship-plus`.

## Install
1. Stop the dev server.
2. Back up or commit your project.
3. Extract this ZIP **into the project root** (`C:\Users\Anita Nwaobi\Documents\Projects\mentorship-plus`) and choose
   **Replace** for every file. Do not copy files across by hand: several are named `index.tsx` and each belongs in a
   different folder.
4. Run `npx expo start -c`.

| Path | Action |
|---|---|
| `app/+native-intent.ts` | New |
| `src/lib/routes.ts` | New |
| `app/_layout.tsx` | Replace |
| `app/index.tsx` | Replace (splash; design unchanged) |
| `app/auth.tsx` | Replace |
| `app/verify.tsx` | Replace |
| `app/reset-password.tsx` | Replace |
| `app/counsellor-invite.tsx` | Replace |
| `app/(admin)/index.tsx` | Replace |
| `app/(counsellor)/index.tsx` | Replace |
| `app/(student)/profile.tsx` | Replace |
| `src/components/WelcomeGate.tsx` | Replace |

## Check it landed correctly (PowerShell, in the project folder)
```
Select-String -Path app\_layout.tsx -Pattern "Stack.Protected"
Select-String -Path "app\(admin)\index.tsx" -Pattern "Admin dashboard"
Test-Path "app\+native-intent.ts"
```
The first two should print matching lines and the last should print `True`.

## Getting it to testers
All changes are JavaScript only, with no native or `app.json` changes, so testers with the current APK can get them
by update:
```
eas update --channel preview --message "Fix blank screen after sign-in and verification link"
```
Testers should fully close and reopen the app. The update downloads on that launch and applies on the next one, so
they may need to close and reopen it twice. A fresh build also works:
`eas build --platform android --profile preview`.

Updates only reach builds with the same runtime version (`version` in `app.json`, currently `1.0.0`). If the
testers' APK was built with a different version, make a new build instead.

## What to test
1. **Sign-in (Android):** sign in as a member, a counsellor and an admin. Each should land on its own dashboard
   once, with no blank screen. Android Back on the dashboard should leave the app.
2. **Admin on iPhone (Expo Go):** sign in as admin. The dashboard should appear once.
3. **Verification link:** register, switch to the email app and tap the link while the app is in the background.
   The app should open on "Confirming your email…" and then show "Email verified" with **Continue to sign in**.
   Repeat with the app fully closed.
4. **Sign-out:** sign out from each role. You should land on the sign-in screen.
5. **First-time welcome:** sign in with a brand-new account. The welcome sheet should slide up shortly after the
   dashboard appears.

## Rollback
Restore your backup or `git checkout` the listed files, and delete `app/+native-intent.ts` and `src/lib/routes.ts`.
