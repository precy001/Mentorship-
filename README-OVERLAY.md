# Overlay: Mentorship+ splash redesign + app icon

This ZIP contains only new and modified files, at their exact paths inside `mentorship-plus`.

## Install
1. Close Metro / the dev server.
2. Back up (or commit) `app/index.tsx` and `app.json`.
3. Extract this ZIP **into the project root** (`C:\Users\Anita Nwaobi\Documents\Projects\mentorship-plus`) and choose **Replace** when asked.
4. Run `npx expo start -c` (the `-c` clears the Metro cache).

## Files
| Path | Action |
|---|---|
| `app/index.tsx` | Replaces the existing file |
| `app.json` | Replaces the existing file (all previous keys kept; icon keys added) |
| `assets/brand/icon.png` | New |
| `assets/brand/adaptive-foreground.png` | New |
| `assets/brand/adaptive-monochrome.png` | New |
| `assets/brand/favicon.png` | New |

If you have edited `app.json` since the upload, copy only the `icon`, `backgroundColor`, `android.backgroundColor`, `android.adaptiveIcon` and `web.favicon` entries into your version instead of replacing it.

## Important: the app icon needs a new native build
Icons are baked into the APK/AAB. The splash redesign is JavaScript, so it shows up in a dev server or an EAS Update right away, but the launcher icon only changes after a new build:
```
eas build --platform android --profile preview
```
Because `runtimeVersion.policy` is `appVersion`, an over-the-air update will not carry the icon.

## Native launch screen
`expo-splash-screen` is not in this project's dependencies, and Expo SDK 57 ignores the `splash` key for native builds, so the native launch screen is not configurable without adding that package. To avoid a white flash, `backgroundColor` and `android.backgroundColor` are set to the splash's navy (`#0A1030`). On Android 12+ the system shows the new adaptive icon on that colour before the redesigned screen appears. If you would like a fully custom native splash, add `expo-splash-screen` and its config plugin as a separate step.

## Rollback
Restore your backups of `app/index.tsx` and `app.json`; the `assets/brand/` folder can stay or be deleted.
