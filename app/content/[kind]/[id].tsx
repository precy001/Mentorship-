import React, { useEffect, useState } from "react";
import { Linking, Share, Text, View } from "react-native";
import { AppAlert } from "@/src/lib/alert";
import { Ionicons } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import { Screen, Button, Card, Pill, EmptyState, LoadingBlock } from "@/src/components/UI";
import { SmartImage } from "@/src/components/Forms";
import { DeadlineBadge } from "@/src/components/ContentCards";
import { useApp } from "@/src/context/AppContext";
import { colors } from "@/src/lib/theme";
import { formatDisplayDate } from "@/src/lib/validation";
import { resourceArt, scholarshipArt } from "@/src/lib/contentArt";
import { isForMember } from "@/src/lib/audience";
import { leaveScreen, type ContentKind } from "@/src/lib/routes";
import { apiGetPublicGrants, apiGetPublicResources, apiGetPublicScholarships } from "@/src/lib/api";

type Detail = {
  kind: ContentKind;
  id: string;
  title: string;
  provider?: string;
  description: string;
  eligibility?: string;
  imageUrl: string | null;
  applyUrl: string | null;
  deadline: string | null;
  pills: { label: string; tone?: "blue" | "green" | "amber" | "red" | "purple" | "neutral" }[];
  meta?: string;
};

const KIND_LABEL: Record<ContentKind, string> = { resource: "Resource", scholarship: "Scholarship", grant: "Grant" };

/**
 * The full page for one resource, scholarship or grant: complete text, deadline, official link, save and share.
 * Items come from the member's already-loaded lists; if one is missing (for example a link shared by someone
 * else), it is fetched once.
 */
export default function ContentDetail() {
  const params = useLocalSearchParams<{ kind: string; id: string }>();
  const kind = (["resource", "scholarship", "grant"].includes(String(params.kind)) ? params.kind : "resource") as ContentKind;
  const id = String(params.id || "");
  const app = useApp();
  const [fetched, setFetched] = useState<Detail | null>(null);
  const [loading, setLoading] = useState(false);

  const fromState = (): Detail | null => {
    if (kind === "resource") {
      const item = app.resources.find((r) => r.id === id);
      return item ? { kind, id, title: item.title, description: item.description, imageUrl: item.imageUrl, applyUrl: null, deadline: null, pills: [{ label: item.category }], meta: item.readTime } : null;
    }
    if (kind === "scholarship") {
      const item = app.scholarships.find((s) => s.id === id);
      return item ? { kind, id, title: item.title, provider: item.provider, description: item.description, eligibility: item.eligibility, imageUrl: item.imageUrl, applyUrl: item.applyUrl, deadline: item.deadline, pills: [{ label: item.level }] } : null;
    }
    const item = app.grants.find((g) => g.id === id);
    return item ? { kind, id, title: item.title, provider: item.provider, description: item.description, eligibility: item.eligibility, imageUrl: item.imageUrl, applyUrl: item.applyUrl, deadline: item.deadline, pills: item.amount ? [{ label: item.amount, tone: "green" }] : [] } : null;
  };
  const known = fromState();
  const detail = known ?? fetched;

  useEffect(() => {
    if (known || !id) return;
    let active = true;
    setLoading(true);
    (async () => {
      try {
        if (kind === "resource") {
          const item = (await apiGetPublicResources()).find((r) => r.id === id);
          if (item && isForMember(item, app.user) && active) setFetched({ kind, id, title: item.title, description: item.description, imageUrl: item.imageUrl, applyUrl: null, deadline: null, pills: [{ label: item.category }], meta: item.readTime });
        } else if (kind === "scholarship") {
          const item = (await apiGetPublicScholarships()).find((s) => s.id === id);
          if (item && isForMember(item, app.user) && active) setFetched({ kind, id, title: item.title, provider: item.provider, description: item.description, eligibility: item.eligibility, imageUrl: item.imageUrl, applyUrl: item.applyUrl ?? null, deadline: item.deadline, pills: [{ label: item.level }] });
        } else {
          const item = (await apiGetPublicGrants()).find((g) => g.id === id);
          if (item && isForMember(item, app.user) && active) setFetched({ kind, id, title: item.title, provider: item.provider, description: item.description, eligibility: item.eligibility, imageUrl: item.imageUrl, applyUrl: item.applyUrl, deadline: item.deadline, pills: item.amount ? [{ label: item.amount, tone: "green" }] : [] });
        }
      } catch { /* shown as "not available" below */ }
      finally { if (active) setLoading(false); }
    })();
    return () => { active = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [kind, id, !!known]);

  const saved = kind === "resource" ? app.savedResources.includes(id) : kind === "scholarship" ? app.savedScholarships.includes(id) : app.savedGrants.includes(id);
  const toggleSave = () => (kind === "resource" ? app.toggleResource(id) : kind === "scholarship" ? app.toggleScholarship(id) : app.toggleGrant(id));

  const openLink = async (url: string) => {
    try {
      if (!/^https?:\/\//i.test(url)) throw new Error("unsupported");
      await Linking.openURL(url);
    } catch {
      AppAlert.alert("Link could not be opened", "Copy the address and open it in your browser instead.");
    }
  };

  const share = async () => {
    if (!detail) return;
    const lines = [detail.title, detail.provider, detail.deadline ? `Closes ${formatDisplayDate(detail.deadline)}` : null, detail.applyUrl, "Shared from Mentorship+"].filter(Boolean);
    try { await Share.share({ title: detail.title, message: lines.join("\n") }); } catch { /* the person closed the share sheet */ }
  };

  if (!detail) {
    return <Screen>
      <Button title="Back" variant="ghost" icon="chevron-back" size="sm" style={{ alignSelf: "flex-start", borderWidth: 0, paddingHorizontal: 0 }} onPress={() => leaveScreen(app.user?.role)} />
      {loading ? <LoadingBlock label="Opening…" /> : <EmptyState icon="alert-circle-outline" title="This item isn’t available" message="It may have been unpublished, its deadline may have passed, or it isn’t meant for your membership category." actionLabel="Go to Explore" onAction={() => router.replace("/(student)/explore")} />}
    </Screen>;
  }

  const fallbackArt = detail.kind === "scholarship" ? scholarshipArt() : resourceArt(detail.kind === "grant" ? "Business" : detail.pills[0]?.label ?? "General");

  return <Screen style={{ gap: 16 }}>
    <Button title="Back" variant="ghost" icon="chevron-back" size="sm" style={{ alignSelf: "flex-start", borderWidth: 0, paddingHorizontal: 0 }} onPress={() => leaveScreen(app.user?.role)} />
    <SmartImage uri={detail.imageUrl} fallbackSource={fallbackArt} aspectRatio={16 / 9} radius={20} fallbackIcon="image-outline" accessibilityLabel={`Image for ${detail.title}`} />

    <View style={{ gap: 10 }}>
      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6 }}>
        <Pill label={KIND_LABEL[detail.kind]} tone="purple" />
        {detail.pills.map((pill) => <Pill key={pill.label} label={pill.label} tone={pill.tone} />)}
        {detail.kind === "grant" && !detail.deadline ? <Pill label="Open all year" tone="blue" /> : null}
        {detail.deadline ? <DeadlineBadge deadline={detail.deadline} /> : null}
      </View>
      <Text accessibilityRole="header" style={{ color: colors.ink, fontSize: 26, lineHeight: 32, fontWeight: "800", letterSpacing: -0.6 }}>{detail.title}</Text>
      {detail.provider ? <Text style={{ color: colors.primaryDark, fontSize: 14, fontWeight: "700" }}>{detail.provider}</Text> : null}
      {detail.meta ? <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}><Ionicons name="time-outline" size={15} color={colors.muted} /><Text style={{ color: colors.muted, fontSize: 13 }}>{detail.meta}</Text></View> : null}
    </View>

    <View style={{ flexDirection: "row", gap: 10 }}>
      <Button title={saved ? "Saved" : "Save"} icon={saved ? "heart" : "heart-outline"} variant="secondary" size="sm" style={{ flex: 1 }} onPress={toggleSave} />
      <Button title="Share" icon="share-social-outline" variant="secondary" size="sm" style={{ flex: 1 }} onPress={() => void share()} />
    </View>

    <Text style={{ color: colors.ink, fontSize: 16, lineHeight: 25 }}>{detail.description}</Text>

    {detail.eligibility ? <Card style={{ gap: 6 }}>
      <Text style={{ color: colors.ink, fontWeight: "800" }}>{detail.kind === "grant" ? "Who can apply" : "Eligibility"}</Text>
      <Text style={{ color: colors.muted, lineHeight: 21 }}>{detail.eligibility}</Text>
    </Card> : null}

    {detail.deadline ? <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
      <Ionicons name="calendar-outline" size={17} color={colors.muted} />
      <Text style={{ color: colors.ink, fontWeight: "700" }}>Deadline {formatDisplayDate(detail.deadline)}</Text>
    </View> : null}

    {detail.applyUrl ? <Button title={detail.kind === "resource" ? "Open link" : "Apply on the official site"} icon="open-outline" onPress={() => void openLink(detail.applyUrl!)} /> : null}
    {detail.kind !== "resource" ? <Text style={{ color: colors.muted, fontSize: 12, lineHeight: 18 }}>Always confirm details and deadlines with the provider, and never pay anyone to apply for a grant or scholarship.</Text> : null}

    <Card style={{ gap: 10, backgroundColor: colors.brandSurface, borderColor: colors.brandBorder }}>
      <Text style={{ color: colors.ink, fontWeight: "800" }}>Want help with this?</Text>
      <Text style={{ color: colors.muted, lineHeight: 20 }}>A mentor can help you plan your next step{detail.kind === "resource" ? "" : " or prepare your application"}.</Text>
      <Button title="Talk to a mentor" icon="chatbubble-ellipses-outline" size="sm" variant="secondary" onPress={() => router.push("/(student)/counselling")} />
    </Card>
  </Screen>;
}
