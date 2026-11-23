import React, { useRef, useState } from "react";
import { Alert, Image, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { router, useLocalSearchParams, useNavigation } from "expo-router";
import { Screen, Button, Field, BackLink, Segmented, Card, IconBadge } from "@/src/components/UI";
import { colors } from "@/src/lib/theme";
import { toAppUser, useApp } from "@/src/context/AppContext";
import { apiLogin, apiResendVerification } from "@/src/lib/api";

type Mode = "signin" | "signup";

const SIGNUP_STEPS: { icon: React.ComponentProps<typeof Ionicons>["name"]; title: string; body: string }[] = [
  { icon: "location-outline", title: "Choose your area", body: "Select your LGA and LCDA so we can match you to the right support." },
  { icon: "person-outline", title: "Tell us about you", body: "Pick the membership category that fits you best and add a few details." },
  { icon: "mail-outline", title: "Verify your email", body: "We email you a link to confirm your address before you sign in." },
];

export default function AuthScreen() {
  const params = useLocalSearchParams<{ mode?: string; signedOut?: string }>();
  const [mode, setMode] = useState<Mode>(params.mode === "signup" ? "signup" : "signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errors, setErrors] = useState<{ email?: string | null; password?: string | null }>({});
  const [busy, setBusy] = useState(false);
  const [resending, setResending] = useState(false);
  const submitting = useRef(false);
  const { login } = useApp();
  const navigation = useNavigation();
  // After signing out, or when opened from an email link, there is no screen behind this one.
  const showBack = params.signedOut !== "1" && navigation.canGoBack();

  const validEmail = (value: string) => /^\S+@\S+\.\S+$/.test(value);

  const submit = async () => {
    if (mode === "signup") {
      router.push("/register-lga");
      return;
    }

    const normalizedEmail = email.trim().toLowerCase();
    const next = {
      email: validEmail(normalizedEmail) ? null : "Enter a valid email address.",
      password: password ? null : "Your password is required to sign in.",
    };
    setErrors(next);
    if (next.email || next.password) return;
    if (submitting.current) return;

    submitting.current = true;
    setBusy(true);
    try {
      const user = await apiLogin(normalizedEmail, password);
      // One mapping for sign-in and session restore keeps every profile field (and the welcome flag) consistent.
      // Signing in is all this screen does: the root layout then swaps the stack to this person's home in one step.
      // Navigating here as well is what produced the blank screen (Android) and the doubled dashboard (iPhone).
      await login(toAppUser(user));
    } catch (error) {
      Alert.alert(
        "Unable to sign in",
        error instanceof Error ? error.message : "We could not sign you in. Check your details and try again.",
      );
    } finally {
      submitting.current = false;
      setBusy(false);
    }
  };

  const resendVerification = async () => {
    const normalizedEmail = email.trim().toLowerCase();
    if (!validEmail(normalizedEmail)) {
      setErrors((current) => ({ ...current, email: "Enter the email address you used to register." }));
      Alert.alert("Enter your email", "Enter the email address you used to register.");
      return;
    }
    setResending(true);
    try {
      const result = await apiResendVerification(normalizedEmail);
      Alert.alert("Request submitted", result.message);
    } catch (error) {
      Alert.alert("Unable to resend link", error instanceof Error ? error.message : "Please try again.");
    } finally {
      setResending(false);
    }
  };

  return (
    <Screen style={{ gap: 0 }}>
      {showBack ? <BackLink /> : <View style={{ height: 12 }} />}

      <View style={{ alignItems: "center", paddingTop: 8, paddingBottom: 24, gap: 8 }}>
        <Image
          source={require("../assets/guidance-logo.png")}
          style={{ width: 76, height: 76, borderRadius: 22, marginBottom: 12 }}
          resizeMode="cover"
          accessibilityElementsHidden
          importantForAccessibility="no"
        />
        <Text accessibilityRole="header" style={{ color: colors.ink, fontSize: 28, fontWeight: "800", letterSpacing: -0.8, textAlign: "center" }}>
          {mode === "signin" ? "Welcome back" : "Create your account"}
        </Text>
        <Text style={{ color: colors.muted, fontSize: 14, lineHeight: 21, textAlign: "center" }}>
          {mode === "signin" ? "Sign in to continue to your account." : "Let’s get your Mentorship+ journey started."}
        </Text>
      </View>

      <View style={{ marginBottom: 20 }}>
        <Segmented
          value={mode}
          disabled={busy}
          onChange={(next) => { setMode(next); setErrors({}); }}
          options={[{ label: "Sign in", value: "signin" }, { label: "Create account", value: "signup" }]}
        />
      </View>

      {mode === "signin" ? (
        <View style={{ gap: 6 }}>
          <Field
            label="Email address"
            icon="mail-outline"
            value={email}
            onChangeText={(v) => { setEmail(v); if (errors.email) setErrors((e) => ({ ...e, email: null })); }}
            placeholder="name@example.com"
            autoCapitalize="none"
            autoCorrect={false}
            keyboardType="email-address"
            autoComplete="email"
            textContentType="emailAddress"
            returnKeyType="next"
            error={errors.email}
            editable={!busy}
          />
          <Field
            label="Password"
            icon="lock-closed-outline"
            value={password}
            onChangeText={(v) => { setPassword(v); if (errors.password) setErrors((e) => ({ ...e, password: null })); }}
            placeholder="Your password"
            secureTextEntry
            autoComplete="current-password"
            textContentType="password"
            returnKeyType="go"
            onSubmitEditing={() => void submit()}
            error={errors.password}
            editable={!busy}
          />
          <View style={{ flexDirection: "row", justifyContent: "space-between", flexWrap: "wrap", gap: 4, marginBottom: 14 }}>
            <Button title="Forgot password?" variant="ghost" size="sm" style={{ borderWidth: 0, paddingHorizontal: 4 }} disabled={busy} onPress={() => router.push("/forgot-password")} />
            <Button
              title={resending ? "Sending link…" : "Resend verification email"}
              variant="ghost"
              size="sm"
              style={{ borderWidth: 0, paddingHorizontal: 4 }}
              disabled={busy || resending}
              onPress={() => void resendVerification()}
            />
          </View>
          <Button title={busy ? "Please wait…" : "Sign in"} loading={busy} onPress={() => void submit()} />
        </View>
      ) : (
        <View style={{ gap: 16 }}>
          <Card style={{ gap: 16 }}>
            <Text style={{ color: colors.ink, fontWeight: "800", fontSize: 15 }}>Registration takes two short steps</Text>
            {SIGNUP_STEPS.map((step) => (
              <View key={step.title} style={{ flexDirection: "row", gap: 12, alignItems: "flex-start" }}>
                <IconBadge icon={step.icon} size={40} />
                <View style={{ flex: 1, gap: 2 }}>
                  <Text style={{ color: colors.ink, fontWeight: "800", fontSize: 14 }}>{step.title}</Text>
                  <Text style={{ color: colors.muted, fontSize: 13, lineHeight: 19 }}>{step.body}</Text>
                </View>
              </View>
            ))}
          </Card>
          <Button title="Continue to registration" onPress={() => void submit()} />
        </View>
      )}

      <View style={{ flexDirection: "row", justifyContent: "center", alignItems: "center", flexWrap: "wrap", gap: 4, marginTop: 24 }}>
        <Text style={{ color: colors.muted, fontSize: 13 }}>{mode === "signin" ? "Don't have an account?" : "Already have an account?"}</Text>
        <Button
          title={mode === "signin" ? "Create one" : "Sign in"}
          variant="ghost"
          size="sm"
          style={{ borderWidth: 0, paddingHorizontal: 6 }}
          disabled={busy}
          onPress={() => { setMode(mode === "signin" ? "signup" : "signin"); setErrors({}); }}
        />
      </View>

      <Text style={{ marginTop: "auto", paddingTop: 20, color: colors.muted, fontSize: 12, lineHeight: 17, textAlign: "center" }}>
        Your account is protected by secure server-side authentication.
      </Text>
    </Screen>
  );
}
