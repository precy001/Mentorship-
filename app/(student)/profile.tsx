import React, { useState } from "react";
import { Alert, ActivityIndicator, Image, Text, View } from "react-native";
import * as ImagePicker from "expo-image-picker";
import { router } from "expo-router";
import { Screen, Heading, Card, Button, Row } from "@/src/components/UI";
import { useApp } from "@/src/context/AppContext";
import { colors } from "@/src/lib/theme";
import { apiUploadProfilePicture } from "@/src/lib/api";

export default function Profile() {
  const app = useApp();
  const [uploading, setUploading] = useState(false);
  const masked = app.user?.nin ? `•••••••${app.user.nin.slice(-4)}` : "Not linked";

  const changePicture = async () => {
    if (uploading) return;
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert("Photo access needed", "Allow Mentorship+ to access your photo library to choose a profile picture.");
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.85,
    });
    if (result.canceled || !result.assets[0]?.uri) return;
    const asset = result.assets[0];
    const mimeType = asset.mimeType || "image/jpeg";
    if (!["image/jpeg", "image/png", "image/webp"].includes(mimeType)) {
      Alert.alert("Unsupported image", "Choose a JPG, PNG, or WebP image.");
      return;
    }
    setUploading(true);
    try {
      const uploaded = await apiUploadProfilePicture(asset.uri, mimeType);
      app.updateAvatar(uploaded.avatarUrl);
      Alert.alert("Profile picture updated", "Your new picture is saved to your account.");
    } catch (error) {
      Alert.alert("Upload failed", error instanceof Error ? error.message : "Your picture could not be uploaded. Please try again.");
    } finally {
      setUploading(false);
    }
  };

  const verifyNin = () => Alert.alert(
    "NIN verification unavailable",
    "NIN verification is not connected to an authorised verification provider yet. Your NIN has not been verified. Please try again when the verification service is configured.",
  );

  return (
    <Screen>
      <Heading title="Your profile" subtitle="Manage your account and personal settings." />
      <Card>
        <Row style={{ alignItems: "center" }}>
          <View style={{ width: 76, height: 76, borderRadius: 24, backgroundColor: colors.softBlue, overflow: "hidden", alignItems: "center", justifyContent: "center" }}>
            {app.user?.avatarUrl
              ? <Image source={{ uri: app.user.avatarUrl }} style={{ width: 76, height: 76 }} resizeMode="cover" />
              : <Text style={{ color: colors.primary, fontSize: 25, fontWeight: "800" }}>{(app.user?.name || "M").trim().charAt(0).toUpperCase()}</Text>}
          </View>
          <View style={{ flex: 1, gap: 4 }}>
            <Text style={{ color: colors.ink, fontWeight: "900", fontSize: 18 }}>{app.user?.name || "Your account"}</Text>
            <Text style={{ color: colors.muted }}>{app.user?.email || app.user?.role || "Member account"}</Text>
            <Text onPress={changePicture} style={{ color: colors.primary, fontWeight: "800", marginTop: 3 }}>{uploading ? "Uploading picture…" : app.user?.avatarUrl ? "Change profile picture" : "Add profile picture"}</Text>
          </View>
          {uploading ? <ActivityIndicator color={colors.primary} /> : null}
        </Row>
        <View style={{ height: 1, backgroundColor: colors.line }} />
        <Text style={{ color: colors.muted, fontSize: 12 }}>IDENTITY INFORMATION</Text>
        <Text style={{ color: colors.ink, fontWeight: "700" }}>NIN · {masked}</Text>
        <Text style={{ color: colors.ink }}>LGA · {app.user?.lga || "Not provided"}</Text>
        <Text style={{ color: colors.ink }}>State · {app.user?.state || "—"}</Text>
      </Card>

      <Button title="Verify NIN" onPress={verifyNin} variant="secondary" />

      <Card>
        <Text style={{ color: colors.ink, fontWeight: "800", fontSize: 16 }}>Your Activity</Text>
        <Row style={{ justifyContent: "space-between" }}><Text style={{ color: colors.muted }}>Saved resources</Text><Text style={{ color: colors.ink, fontWeight: "800" }}>{app.savedResources.length}</Text></Row>
        <Row style={{ justifyContent: "space-between" }}><Text style={{ color: colors.muted }}>Saved scholarships</Text><Text style={{ color: colors.ink, fontWeight: "800" }}>{app.savedScholarships.length}</Text></Row>
        <Row style={{ justifyContent: "space-between" }}><Text style={{ color: colors.muted }}>Appointments</Text><Text style={{ color: colors.ink, fontWeight: "800" }}>{app.bookings.filter(b => b.status !== "cancelled").length}</Text></Row>
        <Row style={{ justifyContent: "space-between" }}><Text style={{ color: colors.muted }}>Mood check-ins</Text><Text style={{ color: colors.ink, fontWeight: "800" }}>{app.moods.length}</Text></Row>
      </Card>

      <Button title="Saved items" onPress={() => router.push({ pathname: "/feature/[slug]", params: { slug: "saved" } })} variant="secondary" />
      <Button title="Help & frequently asked questions" onPress={() => router.push({ pathname: "/feature/[slug]", params: { slug: "help" } })} variant="ghost" />
      <Button title="Log out" onPress={() => Alert.alert("Log out?", "You will be signed out of your account on this device.", [{ text: "Cancel", style: "cancel" }, { text: "Log out", style: "destructive", onPress: async () => { await app.logout(); router.replace("/"); } }])} variant="danger" />
    </Screen>
  );
}
