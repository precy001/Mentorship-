import { AppState } from "react-native";

/**
 * Handles links from outside the app (email verification, password reset, counsellor invitation).
 *
 * When one of these links is tapped while the app is still running in the background (the usual case right
 * after registering: the person switches to their email and taps the link), Android hands the link to the app
 * before it is back in the foreground. Opening a screen at that moment can leave Android showing a blank screen
 * until the app is closed and reopened. So a link that arrives while the app is running is held until the app
 * is in the foreground and has had a moment to settle, and then opened as normal.
 *
 * A link that launches the app from closed (`initial`) becomes the first screen directly and is not delayed.
 */
const SETTLE_MS = 300;

function whenForeground(): Promise<void> {
  if (AppState.currentState === "active") return Promise.resolve();
  return new Promise((resolve) => {
    const subscription = AppState.addEventListener("change", (state) => {
      if (state === "active") {
        subscription.remove();
        resolve();
      }
    });
  });
}

export function redirectSystemPath({ path, initial }: { path: string; initial: boolean }): string | Promise<string | null> {
  if (initial) return path;
  return whenForeground()
    .then(() => new Promise<void>((resolve) => setTimeout(resolve, SETTLE_MS)))
    .then(() => path)
    .catch(() => path);
}
