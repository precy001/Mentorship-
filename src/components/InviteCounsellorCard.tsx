import React, { useState } from "react";
import { Linking, Share, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Button, Card, Field, Heading } from "@/src/components/UI";
import { colors } from "@/src/lib/theme";
import { AppAlert } from "@/src/lib/alert";
import { apiCreateWhatsAppInvitation, invitationLink } from "@/src/lib/api";

/**
 * Lets a counsellor invite someone to become a counsellor by WhatsApp. The server creates a private invitation
 * link; the app then opens WhatsApp (to that number) with a ready-written message, and the counsellor taps Send.
 * Nothing is sent automatically. A counsellor's invitation is approved by an administrator once accepted.
 */
export function InviteCounsellorCard() {
  const [phone, setPhone] = useState("");
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastSent, setLastSent] = useState<string | null>(null);

  const invite = async () => {
    if (phone.replace(/\D/g, "").length < 10) {
      setError("Enter the full WhatsApp number, for example 0803 123 4567 or +234 803 123 4567.");
      return;
    }
    setError(null);
    setBusy(true);
    try {
      const created = await apiCreateWhatsAppInvitation({ phoneNumber: phone.trim(), name: name.trim() || undefined });
      const link = invitationLink(created.invitePath);
      const first = name.trim().split(" ")[0];
      const text = [
        `${first ? `Hi ${first}` : "Hi"}, I'd like to invite you to join Mentorship+ as a counsellor.`,
        "",
        "Open this link on your phone to accept (it expires in 7 days):",
        link,
        "",
        created.requiresApproval
          ? "You'll need the Mentorship+ app and an account. An administrator approves new counsellors."
          : "You'll need the Mentorship+ app and an account.",
      ].join("\n");
      try {
        // wa.me opens the WhatsApp chat with this number and the message ready to send.
        await Linking.openURL(`https://wa.me/${created.whatsappNumber}?text=${encodeURIComponent(text)}`);
      } catch {
        await Share.share({ message: text });
      }
      setLastSent(`+${created.whatsappNumber}`);
      setPhone("");
      setName("");
    } catch (e) {
      AppAlert.alert("Invitation not created", e instanceof Error ? e.message : "Please try again.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Card style={{ gap: 12 }}>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
        <View style={{ width: 40, height: 40, borderRadius: 14, backgroundColor: "#DCFCE7", alignItems: "center", justifyContent: "center" }}>
          <Ionicons name="logo-whatsapp" size={22} color="#15803D" />
        </View>
        <View style={{ flex: 1 }}>
          <Heading title="Invite a counsellor" small subtitle="Share a private invitation on WhatsApp." />
        </View>
      </View>
      <Field label="Their name" optional value={name} onChangeText={setName} placeholder="e.g. Ada Okafor" autoCapitalize="words" maxLength={160} editable={!busy} />
      <Field
        label="Their WhatsApp number"
        icon="logo-whatsapp"
        value={phone}
        onChangeText={(value) => { setPhone(value); if (error) setError(null); }}
        placeholder="0803 123 4567"
        keyboardType="phone-pad"
        maxLength={24}
        required
        helper="Nigerian numbers can start with 0. For other countries, start with + and the country code."
        error={error}
        editable={!busy}
      />
      <Button title={busy ? "Preparing invitation…" : "Invite on WhatsApp"} icon="logo-whatsapp" loading={busy} onPress={() => void invite()} />
      {lastSent ? (
        <View accessibilityLiveRegion="polite" style={{ flexDirection: "row", gap: 8, alignItems: "flex-start" }}>
          <Ionicons name="checkmark-circle" size={18} color={colors.success} />
          <Text style={{ color: colors.success, fontSize: 13, lineHeight: 19, flex: 1, fontWeight: "600" }}>Invitation for {lastSent} is ready. If you didn’t tap Send in WhatsApp, invite them again.</Text>
        </View>
      ) : null}
      <Text style={{ color: colors.muted, fontSize: 12, lineHeight: 17 }}>They’ll help with the same topics as you. After they accept, an administrator approves them before they can take discussions. You can send up to 10 invitations a day.</Text>
    </Card>
  );
}
