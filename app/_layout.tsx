import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { AppProvider } from "@/src/context/AppContext";
import { colors } from "@/src/lib/theme";

export default function RootLayout() {
  return (
    <AppProvider>
      <StatusBar style="dark" backgroundColor={colors.bg} />
      <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.bg }, animation: "fade_from_bottom" }}>
        <Stack.Screen name="index" />
        <Stack.Screen name="verify" options={{ presentation: "card" }} />
        <Stack.Screen name="auth" options={{ presentation: "card" }} />
        <Stack.Screen name="register-lga" options={{ presentation: "card" }} />
        <Stack.Screen name="register-biodata" options={{ presentation: "card" }} />
        <Stack.Screen name="feature/[slug]" options={{ headerShown: false }} />
        <Stack.Screen name="(student)" />
        <Stack.Screen name="(counsellor)" />
        <Stack.Screen name="(admin)" />
      </Stack>
    </AppProvider>
  );
}
