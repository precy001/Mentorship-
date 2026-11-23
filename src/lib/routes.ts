import { router, type Href } from "expo-router";

/** True for both admin roles. */
export const isAdminRole = (role?: string | null) => role === "admin" || role === "super_admin";

/** The home area for a signed-in role. */
export function homeHrefFor(role?: string | null): Href {
  if (isAdminRole(role)) return "/(admin)";
  if (role === "counsellor") return "/(counsellor)";
  return "/(student)";
}

/**
 * Leave a screen that may have been opened straight from an email link (so there may be nothing behind it):
 * go back when possible, otherwise go to the right starting screen for this session.
 */
export function leaveScreen(role?: string | null) {
  if (router.canGoBack()) router.back();
  else router.replace(role ? homeHrefFor(role) : "/");
}
