import React, { useState } from "react";
import { Linking, Pressable, Share, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Button, Card, Field, Heading, Pill, Segmented } from "@/src/components/UI";
import { colors } from "@/src/lib/theme";
import { AppAlert } from "@/src/lib/alert";
import { errorMessage, isSessionExpired } from "@/src/lib/feedback";
import { validateEmail } from "@/src/lib/validation";
import { counsellorInvitationText, looksLikePhoneNumber, whatsAppChatUrl } from "@/src/lib/invitation";
import { apiAdminInviteCounsellor, apiCreateWhatsAppInvitation, invitationLink } from "@/src/lib/api";
import { useApp } from "@/src/context/AppContext";

type Channel = "email" | "whatsapp";
type Errors = { email?: string | null; phone?: string | null; topics?: string | null };

/**
 * Administrators invite counsellors here, by email or on WhatsApp. Choosing who counsels members is an
 * administrative decision, so only administrators can invite (counsellors cannot), and the topics are chosen up
 * front: whoever accepts becomes a counsellor straight away.
 *
 * - Email: the server emails a link; it must be accepted by the account with that email address.
 * - WhatsApp: the server creates a private link, then WhatsApp opens on the administrator's phone with the
 *   message ready to send to that number. Nothing is sent automatically. Up to 10 a day per administrator.
 */
export function InviteCounsellorCard({ topics, disabled, onInvited }: {
  topics: { id: string; name: string }[];
  disabled?: boolean;
  onInvited?: () => void;
}) {
  const app = useApp();
  const [channel, setChannel] = useState<Channel>("email");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [name, setName] = useState("");
  const [topicIds, setTopicIds] = useState<string[]>([]);
  const [errors, setErrors] = useState<Errors>({});
  const [busy, setBusy] = useState(false);
  const [lastWhatsApp, setLastWhatsApp] = useState<string | null>(null);
  const locked = busy || !!disabled;

  const validate = (): boolean => {
    const next: Errors = {
      email: channel === "email" ? validateEmail(email) : null,
      phone: channel === "whatsapp" && !looksLikePhoneNumber(phone) ? "Enter the full WhatsApp number, for example 0803 123 4567 or +234 803 123 4567." : null,
      topics: topicIds.length ? null : "Select at least one counselling topic.",
    };
    setErrors(next);
    return !next.email && !next.phone && !next.topics;
  };

  const fail = (title: string, error: unknown) => {
    if (isSessionExpired(error)) {
      AppAlert.alert("Session expired", "Please sign in again to continue.", [{ text: "Sign in", onPress: async () => { await app.logout(); } }]);
    } else {
      AppAlert.alert(title, errorMessage(error));
    }
  };

  const submit = async () => {
    if (locked || !validate()) return;
    setBusy(true);
    try {
      if (channel === "email") {
        const address = email.trim().toLowerCase();
        await apiAdminInviteCounsellor(address, topicIds);
        AppAlert.alert("Invitation sent", `An invitation was emailed to ${address}. It expires in seven days.`);
        setEmail("");
      } else {
        const created = await apiCreateWhatsAppInvitation({ phoneNumber: phone.trim(), name: name.trim() || undefined, topicIds });
        const text = counsellorInvitationText({ name, link: invitationLink(created.invitePath) });
        try {
          await Linking.openURL(whatsAppChatUrl(created.whatsappNumber, text));
        } catch {
          // No WhatsApp on this phone: offer the share sheet so the message can still be sent another way.
          await Share.share({ message: text });
        }
        setLastWhatsApp(`+${created.whatsappNumber}`);
        setPhone("");
        setName("");
      }
      setTopicIds([]);
      setErrors({});
      onInvited?.();
    } catch (error) {
      fail("Invitation not created", error);
    } finally {
      setBusy(false);
    }
  };

  const toggleTopic = (id: string) => {
    setTopicIds((current) => (current.includes(id) ? current.filter((item) => item !== id) : [...current, id]));
    setErrors((current) => ({ ...current, topics: null }));
  };

  return (
    <Card style={{ gap: 12, borderRadius: 18, borderColor: "#E5EBEF", backgroundColor: "#FFFFFF" }}>
      <Heading title="Invitation details" small subtitle="Choose how to send it and the counselling topics they will cover." />
      <Segmented<Channel>
        value={channel}
        disabled={locked}
        onChange={(next) => { setChannel(next); setErrors({}); }}
        options={[{ label: "Email", value: "email" }, { label: "WhatsApp", value: "whatsapp" }]}
      />

      {channel === "email" ? (
        <Field
          label="Counsellor email address"
          value={email}
          onChangeText={(value) => { setEmail(value); if (errors.email) setErrors((current) => ({ ...current, email: null })); }}
          placeholder="counsellor@example.com"
          keyboardType="email-address"
          autoCapitalize="none"
          autoCorrect={false}
          autoComplete="email"
          textContentType="emailAddress"
          required
          error={errors.email}
          editable={!locked}
          onBlur={() => email && setErrors((current) => ({ ...current, email: validateEmail(email) }))}
        />
      ) : (
        <>
          <Field label="Their name" optional value={name} onChangeText={setName} placeholder="e.g. Ada Okafor" autoCapitalize="words" maxLength={160} editable={!locked} />
          <Field
            label="Their WhatsApp number"
            icon="logo-whatsapp"
            value={phone}
            onChangeText={(value) => { setPhone(value); if (errors.phone) setErrors((current) => ({ ...current, phone: null })); }}
            placeholder="0803 123 4567"
            keyboardType="phone-pad"
            maxLength={24}
            required
            helper="Nigerian numbers can start with 0. For other countries, start with + and the country code."
            error={errors.phone}
            editable={!locked}
          />
        </>
      )}

      <Text style={{ color: colors.ink, fontWeight: "700" }}>Assign topics <Text style={{ color: colors.error }}>*</Text></Text>
      {topics.length ? (
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
          {topics.map((topic) => {
            const selected = topicIds.includes(topic.id);
            return (
              <Pressable key={topic.id} accessibilityRole="checkbox" accessibilityLabel={topic.name} accessibilityState={{ checked: selected, disabled: locked }} disabled={locked} onPress={() => toggleTopic(topic.id)}>
                <Pill label={`${selected ? "✓ " : "+ "}${topic.name}`} tone={selected ? "green" : "blue"} />
              </Pressable>
            );
          })}
        </View>
      ) : <Text style={{ color: colors.muted, fontSize: 12 }}>No active topics yet. Create a counselling topic in Counselling first.</Text>}
      {errors.topics ? <Text accessibilityLiveRegion="polite" style={{ color: colors.error, fontSize: 12, fontWeight: "600" }}>{errors.topics}</Text> : null}

      <Button
        title={busy ? (channel === "email" ? "Sending…" : "Preparing invitation…") : channel === "email" ? "Send counsellor invitation" : "Invite on WhatsApp"}
        icon={channel === "whatsapp" ? "logo-whatsapp" : "mail-outline"}
        loading={busy}
        disabled={locked}
        onPress={() => void submit()}
      />

      {channel === "whatsapp" && lastWhatsApp ? (
        <View accessibilityLiveRegion="polite" style={{ flexDirection: "row", gap: 8, alignItems: "flex-start" }}>
          <Ionicons name="checkmark-circle" size={18} color={colors.success} />
          <Text style={{ color: colors.success, fontSize: 13, lineHeight: 19, flex: 1, fontWeight: "600" }}>The invitation for {lastWhatsApp} is ready. If you didn’t tap Send in WhatsApp, invite them again.</Text>
        </View>
      ) : null}
      <Text style={{ color: colors.muted, fontSize: 12, lineHeight: 17 }}>
        {channel === "email"
          ? "They must sign in with this email address to accept. Invitations expire after seven days."
          : "WhatsApp opens with the message ready; you tap Send. Whoever accepts becomes a counsellor for these topics. Invitations expire after seven days, and you can send up to 10 a day."}
      </Text>
    </Card>
  );
}
