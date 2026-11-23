import React, { useEffect, useState } from "react";
import { Alert, Pressable, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import { router } from "expo-router";
import { Screen, Heading, Card, Button, Avatar, Pill, Divider, InfoRow, Chip, SectionHeader, StatTile, ListGroup, ListRow } from "@/src/components/UI";
import { useApp } from "@/src/context/AppContext";
import { colors } from "@/src/lib/theme";
import { apiGetMembershipCategories, apiUpdateMembership, apiUpdateProfile, apiUploadProfilePicture, apiListActivities, MembershipCategory } from "@/src/lib/api";
import { DatePickerField } from "@/src/components/Forms";
import { Field } from "@/src/components/UI";
import { normalizePhone, toDateString, validateDateString, validateLength, validatePhone } from "@/src/lib/validation";

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
  const [name, setName] = useState(app.user?.name || "");
  const [phone, setPhone] = useState(app.user?.phoneNumber || "");
  const [dob, setDob] = useState(app.user?.dateOfBirth || "");
  const [school, setSchool] = useState(app.user?.school || "");
  const [savingDetails, setSavingDetails] = useState(false);
  const [showDetailErrors, setShowDetailErrors] = useState(false);
  const saved = app.user;
  // Show the stored values again after a save or when the account is reloaded.
  useEffect(() => {
    setName(saved?.name || ""); setPhone(saved?.phoneNumber || ""); setDob(saved?.dateOfBirth || ""); setSchool(saved?.school || "");
  }, [saved?.id, saved?.name, saved?.phoneNumber, saved?.dateOfBirth, saved?.school]);
  const today = new Date();
  const youngest = toDateString(new Date(today.getFullYear() - 13, today.getMonth(), today.getDate()));
  const oldest = toDateString(new Date(today.getFullYear() - 120, today.getMonth(), today.getDate()));
  const detailErrors = {
    name: validateLength(name, "Full name", { min: 2, max: 160 }),
    phone: validatePhone(phone, { required: false }),
    dob: dob ? validateDateString(dob, "Date of birth", { min: oldest, max: youngest }) : null,
    school: validateLength(school, "School or organisation", { max: 180, required: false }),
  };
  const detailsChanged = name.trim() !== (saved?.name || "") || normalizePhone(phone) !== normalizePhone(saved?.phoneNumber || "") || dob !== (saved?.dateOfBirth || "") || school.trim() !== (saved?.school || "");
  const saveDetails = async () => {
    setShowDetailErrors(true);
    if (Object.values(detailErrors).some(Boolean)) return;
    const changes: { displayName?: string; phoneNumber?: string; dateOfBirth?: string; school?: string } = {};
    if (name.trim() !== (saved?.name || "")) changes.displayName = name.trim();
    if (normalizePhone(phone) !== normalizePhone(saved?.phoneNumber || "")) changes.phoneNumber = normalizePhone(phone);
    if (dob && dob !== (saved?.dateOfBirth || "")) changes.dateOfBirth = dob;
    if (school.trim() !== (saved?.school || "")) changes.school = school.trim();
    if (!Object.keys(changes).length) return;
    try {
      setSavingDetails(true);
      app.applyAccount(await apiUpdateProfile(changes));
      setShowDetailErrors(false);
      Alert.alert("Profile saved", "Your details have been updated.");
    } catch (error) {
      Alert.alert("Could not save", error instanceof Error ? error.message : "Please try again.");
    } finally { setSavingDetails(false); }
  };

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
        <Heading title="Personal details" small subtitle="Keep your details up to date. Your email address cannot be changed here." />
        <Field label="Full name" value={name} onChangeText={setName} required maxLength={160} autoCapitalize="words" textContentType="name" editable={!savingDetails} error={showDetailErrors ? detailErrors.name : null} />
        <Field label="Phone number" optional value={phone} onChangeText={setPhone} keyboardType="phone-pad" maxLength={24} textContentType="telephoneNumber" placeholder="+2348012345678" editable={!savingDetails} error={showDetailErrors ? detailErrors.phone : null} />
        <DatePickerField label="Date of birth" optional value={dob} onChange={setDob} minDate={oldest} maxDate={youngest} defaultView={`${today.getFullYear() - 20}-01-01`} error={showDetailErrors ? detailErrors.dob : null} />
        <Field label="School or organisation" optional value={school} onChangeText={setSchool} maxLength={180} editable={!savingDetails} error={showDetailErrors ? detailErrors.school : null} />
        <Divider />
        <InfoRow icon="location-outline" label="LGA" value={app.user?.lga || "Not provided"} />
        <InfoRow icon="map-outline" label="State" value={app.user?.state || "—"} />
        <Button title={savingDetails ? "Saving…" : "Save details"} loading={savingDetails} disabled={!detailsChanged} onPress={() => void saveDetails()} />
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

      <Button title="Log out" icon="log-out-outline" variant="dangerSoft" onPress={() => Alert.alert("Log out?", "You will be signed out of your account on this device.", [{ text: "Cancel", style: "cancel" }, { text: "Log out", style: "destructive", onPress: async () => { await app.logout(); /* returns to sign-in automatically (app/_layout.tsx) */ } }])} />
    </Screen>
  );
}
