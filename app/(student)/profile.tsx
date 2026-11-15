import React, { useEffect, useState } from "react";
import { Alert, Pressable, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import { router } from "expo-router";
import { Screen, Heading, Card, Button, Avatar, Pill, Divider, InfoRow, Chip, SectionHeader, StatTile, ListGroup, ListRow } from "@/src/components/UI";
import { useApp } from "@/src/context/AppContext";
import { colors } from "@/src/lib/theme";
import { apiGetMembershipCategories, apiUpdateMembership, apiUploadProfilePicture, apiListActivities, MembershipCategory } from "@/src/lib/api";

export default function Profile() {
  const app = useApp();
  const [uploading, setUploading] = useState(false);
  const [categories, setCategories] = useState<MembershipCategory[]>([]);
  const [categoryId, setCategoryId] = useState(app.user?.categoryId || "");
  const [subcategoryId, setSubcategoryId] = useState(app.user?.subcategoryId || "");
  const [savingMembership, setSavingMembership] = useState(false);
  const [moodCount, setMoodCount] = useState(0);
  useEffect(() => { apiGetMembershipCategories().then(setCategories).catch(error => Alert.alert("Membership options unavailable", error instanceof Error ? error.message : "Please try again.")); apiListActivities("WELLBEING_CHECKIN").then(items => setMoodCount(items.length)).catch(() => {}); }, []);
  const selectedCategory = categories.find(item => item.id === categoryId);
  const selectedSubcategory = selectedCategory?.subcategories.find(item => item.id === subcategoryId);
  const unchanged = categoryId === (app.user?.categoryId || "") && subcategoryId === (app.user?.subcategoryId || "");
  const saveMembership = async () => {
    if (!selectedCategory || !selectedSubcategory) return Alert.alert("Choose your membership", "Select a category and a matching subcategory.");
    try { setSavingMembership(true); await apiUpdateMembership(categoryId, subcategoryId); app.updateMembership({ categoryId, categoryName: selectedCategory.name, categorySlug: selectedCategory.slug, subcategoryId, subcategoryName: selectedSubcategory.name, subcategorySlug: selectedSubcategory.slug }); Alert.alert("Membership updated", "Your dashboard will now reflect your selected category."); }
    catch (error) { Alert.alert("Update failed", error instanceof Error ? error.message : "Your membership could not be updated."); }
    finally { setSavingMembership(false); }
  };
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

  const stats = [
    { label: "Saved resources", value: app.savedResources.length, icon: "book-outline" as const },
    { label: "Saved scholarships", value: app.savedScholarships.length, icon: "school-outline" as const },
    { label: "Appointments", value: app.bookings.filter(b => b.status !== "cancelled").length, icon: "calendar-outline" as const },
    { label: "Mood check-ins", value: moodCount, icon: "heart-outline" as const },
  ];

  return (
    <Screen tabBar>
      <Heading title="Your profile" subtitle="Manage your account and personal settings." />

      <Card>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 16 }}>
          <Pressable accessibilityRole="button" accessibilityLabel={app.user?.avatarUrl ? "Change profile picture" : "Add profile picture"} disabled={uploading} onPress={() => void changePicture()}>
            <Avatar name={app.user?.name} uri={app.user?.avatarUrl} size={80} />
            <View style={{ position: "absolute", right: -6, bottom: -6, width: 30, height: 30, borderRadius: 15, backgroundColor: colors.primary, borderWidth: 2, borderColor: colors.white, alignItems: "center", justifyContent: "center" }}>
              <Ionicons name={uploading ? "cloud-upload-outline" : "camera"} size={15} color={colors.white} />
            </View>
          </Pressable>
          <View style={{ flex: 1, gap: 4 }}>
            <Text style={{ color: colors.ink, fontWeight: "800", fontSize: 19, letterSpacing: -0.3 }} numberOfLines={2}>{app.user?.name || "Your account"}</Text>
            <Text style={{ color: colors.muted, fontSize: 13 }} numberOfLines={1}>{app.user?.email || app.user?.role || "Member account"}</Text>
            {app.user?.subcategoryName || app.user?.categoryName ? <Pill label={app.user?.subcategoryName || app.user?.categoryName || ""} tone="blue" /> : null}
          </View>
        </View>
        <Button title={uploading ? "Uploading picture…" : app.user?.avatarUrl ? "Change profile picture" : "Add profile picture"} icon="camera-outline" variant="secondary" size="sm" loading={uploading} onPress={() => void changePicture()} />
      </Card>

      <Card>
        <Heading title="Identity" small subtitle="Your NIN is always shown masked." />
        <InfoRow icon="id-card-outline" label="NIN" value={masked} />
        <InfoRow icon="location-outline" label="LGA" value={app.user?.lga || "Not provided"} />
        <InfoRow icon="map-outline" label="State" value={app.user?.state || "—"} />
        <Divider />
        <Button title="Verify NIN" icon="shield-checkmark-outline" variant="ghost" size="sm" onPress={verifyNin} />
      </Card>

      <Card>
        <Heading title="Membership category" small subtitle="You can change your category and subcategory. Your existing profile information will be retained." />
        {app.user?.categoryName ? (
          <View accessible accessibilityLabel={`Current membership: ${app.user.categoryName}${app.user.subcategoryName ? `, ${app.user.subcategoryName}` : ""}`} style={{ flexDirection: "row", alignItems: "center", gap: 8, backgroundColor: colors.brandSurface, padding: 12, borderRadius: 14 }}>
            <Ionicons name="ribbon-outline" size={18} color={colors.primary} />
            <Text style={{ color: colors.ink, fontSize: 13, flex: 1 }}>Current: <Text style={{ fontWeight: "800" }}>{app.user.categoryName}{app.user.subcategoryName ? ` · ${app.user.subcategoryName}` : ""}</Text></Text>
          </View>
        ) : null}
        <Text style={{ color: colors.ink, fontWeight: "700", fontSize: 13 }}>Category</Text>
        <View accessibilityRole="radiogroup" style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
          {categories.map(category => <Chip key={category.id} label={category.name} accessibilityRole="radio" selected={categoryId === category.id} onPress={() => { setCategoryId(category.id); setSubcategoryId(""); }} />)}
        </View>
        {selectedCategory ? <>
          <Text style={{ color: colors.ink, fontWeight: "700", fontSize: 13 }}>Subcategory</Text>
          <View accessibilityRole="radiogroup" style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
            {selectedCategory.subcategories.map(subcategory => <Chip key={subcategory.id} label={subcategory.name} accessibilityRole="radio" selected={subcategoryId === subcategory.id} onPress={() => setSubcategoryId(subcategory.id)} />)}
          </View>
        </> : null}
        <Button title={savingMembership ? "Saving…" : "Save membership changes"} loading={savingMembership} onPress={() => void saveMembership()} disabled={!categoryId || !subcategoryId || unchanged} />
        {unchanged ? <Text style={{ color: colors.muted, fontSize: 12, textAlign: "center" }}>Choose a different category or subcategory to save a change.</Text> : null}
      </Card>

      <SectionHeader title="Your activity" />
      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 12 }}>
        {stats.map(stat => <StatTile key={stat.label} label={stat.label} value={stat.value} icon={stat.icon} />)}
      </View>

      <ListGroup>
        <ListRow icon="heart-outline" title="Saved items" subtitle="Resources and scholarships you’ve saved" onPress={() => router.push({ pathname: "/feature/[slug]", params: { slug: "saved" } })} />
        <ListRow icon="help-circle-outline" title="Help & frequently asked questions" last onPress={() => router.push({ pathname: "/feature/[slug]", params: { slug: "help" } })} />
      </ListGroup>

      <Button title="Log out" icon="log-out-outline" variant="dangerSoft" onPress={() => Alert.alert("Log out?", "You will be signed out of your account on this device.", [{ text: "Cancel", style: "cancel" }, { text: "Log out", style: "destructive", onPress: async () => { await app.logout(); router.replace({ pathname: "/auth", params: { mode: "signin", signedOut: "1" } }); } }])} />
    </Screen>
  );
}
