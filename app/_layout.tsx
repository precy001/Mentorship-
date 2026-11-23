import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { AppProvider, useApp } from "@/src/context/AppContext";
import { colors } from "@/src/lib/theme";
import { isAdminRole } from "@/src/lib/routes";
import { WelcomeGate } from "@/src/components/WelcomeGate";
import { AlertHost } from "@/src/components/AlertHost";

export default function RootLayout() {
  return (
    <AppProvider>
      <StatusBar style="dark" />
      <RootNavigator />
      <WelcomeGate />
      {/* Mentorship+ dialogs, drawn above every screen (replaces the system alert boxes). */}
      <AlertHost />
    </AppProvider>
  );
}

/**
 * The screens that exist depend on who is signed in. When the session changes (sign-in, session restore,
 * sign-out), the stack swaps to the right set of screens in a single step: signed-out screens are removed and
 * the role's home takes their place, or the reverse. No screen navigates on its own after signing in or out,
 * so two navigations can never race each other (that race caused the blank screen after sign-in on Android
 * and the dashboard appearing twice on iPhone).
 *
 * Order matters: when the current screens are removed, the stack falls back to the first screen still
 * available. That is `auth` after signing out, and the role's home after signing in.
 */
function RootNavigator() {
  const { user } = useApp();
  const signedIn = !!user;
  const isAdmin = isAdminRole(user?.role);
  const isCounsellor = user?.role === "counsellor";
  const isMember = signedIn && !isAdmin && !isCounsellor;

  return (
    <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.bg }, animation: "fade_from_bottom" }}>
      {/* Signed out */}
      <Stack.Protected guard={!signedIn}>
        <Stack.Screen name="auth" options={{ presentation: "card" }} />
        <Stack.Screen name="index" />
        <Stack.Screen name="register-lga" options={{ presentation: "card" }} />
        <Stack.Screen name="register-biodata" options={{ presentation: "card" }} />
        <Stack.Screen name="forgot-password" options={{ presentation: "card" }} />
        <Stack.Screen name="check-email" options={{ presentation: "card" }} />
      </Stack.Protected>

      {/* Signed in: each role only has its own home */}
      <Stack.Protected guard={isMember}>
        <Stack.Screen name="(student)" />
      </Stack.Protected>
      <Stack.Protected guard={isCounsellor}>
        <Stack.Screen name="(counsellor)" />
      </Stack.Protected>
      <Stack.Protected guard={isAdmin}>
        <Stack.Screen name="(admin)" />
      </Stack.Protected>
      <Stack.Protected guard={signedIn}>
        <Stack.Screen name="discussion/[id]" options={{ presentation: "card" }} />
        <Stack.Screen name="feature/[slug]" options={{ headerShown: false }} />
        <Stack.Screen name="content/[kind]/[id]" options={{ presentation: "card" }} />
        <Stack.Screen name="news/index" options={{ presentation: "card" }} />
        <Stack.Screen name="news/[id]" options={{ presentation: "card" }} />
      </Stack.Protected>

      {/* Email links: open whether or not someone is signed in */}
      <Stack.Screen name="verify" options={{ presentation: "card" }} />
      <Stack.Screen name="reset-password" options={{ presentation: "card" }} />
      <Stack.Screen name="counsellor-invite" options={{ presentation: "card" }} />
      {/* Open to everyone, signed in or not */}
      <Stack.Screen name="policies" options={{ presentation: "card" }} />
    </Stack>
  );
}
