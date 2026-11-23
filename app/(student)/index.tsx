import React, { useState } from "react";
import { Pressable, Text, View } from "react-native";
import { AppAlert } from "@/src/lib/alert";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { Screen, SectionHeader, Card, Pill, Avatar, HeroCard, IconBadge, Button } from "@/src/components/UI";
import { FeaturedBanner, GrantCard, ResourceCard, ScholarshipCard } from "@/src/components/ContentCards";
import { openContent } from "@/src/lib/routes";
import { colors, shadows } from "@/src/lib/theme";
import { appointmentTone, formatDateTime, humanize } from "@/src/lib/format";
import { useApp } from "@/src/context/AppContext";
import { NewsCard } from "@/src/components/NewsCard";
import { refreshNews, useNews } from "@/src/lib/news";
import { isNewPost } from "@/src/lib/newsFeed";

export default function StudentHome() {
  const app = useApp();
  const userId = app.user?.id;
  const news = useNews(userId);
  const [refreshing, setRefreshing] = useState(false);
  const name = app.user?.name?.split(" ")[0] || "there";
  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";
  const go = (slug: string) => slug === "counselling" ? router.push("/(student)/counselling")
    : slug === "scholarships" || slug === "grants" || slug === "resources" ? router.push({ pathname: "/(student)/explore", params: { tab: slug } })
    : slug === "explore" ? router.push("/(student)/explore")
    : router.push({ pathname: "/feature/[slug]", params: { slug } });
  const categorySlug = app.user?.categorySlug || "";
  const isEducation = categorySlug === "education-learning";
  const isCareer = categorySlug === "work-career";
  const subcategorySlug = app.user?.subcategorySlug || "";
  const isBusinessFocused = ["self-employed-business-owner", "artisan-skilled-tradesperson", "freelancer-gig-worker"].includes(subcategorySlug);
  const focusLabel = app.user?.subcategoryName || app.user?.categoryName || "your next step";
  const quick = [
    ...(isEducation ? [{ title: "Learning resources", slug: "resources", icon: "book-outline" as const }, { title: "Scholarships", slug: "scholarships", icon: "school-outline" as const }] : []),
    ...(isCareer ? [isBusinessFocused ? { title: "Business guidance", slug: "business", icon: "briefcase-outline" as const } : { title: "Career growth", slug: "career", icon: "trending-up-outline" as const }, { title: "Grants", slug: "grants", icon: "cash-outline" as const }] : []),
    ...(!isEducation && !isCareer ? [{ title: "Explore opportunities", slug: "explore", icon: "compass-outline" as const }] : []),
    { title: "Speak to a counsellor", slug: "counselling", icon: "chatbubble-ellipses-outline" as const },
    { title: "Book appointment", slug: "booking", icon: "calendar-outline" as const },
  ];
  const unread = app.unreadCount;
  const upcoming = app.bookings.filter(b => ["requested", "confirmed", "rescheduled"].includes(b.status) && new Date(b.startsAt).getTime() > Date.now());
  const doneGoals = app.goals.filter(g => g.done).length;
  const lastCheckin = app.checkins[0];
  const checkedInToday = !!lastCheckin && new Date(lastCheckin.createdAt).toDateString() === new Date().toDateString();
  const missingNin = (app.user?.role === "member" || app.user?.role === "student") && !app.user?.nin;

  const onRefresh = async () => {
    setRefreshing(true);
    try { await Promise.all([app.refreshAccountData(), userId ? refreshNews(userId, { force: true }) : null]); } finally { setRefreshing(false); }
  };

  return (
    <Screen tabBar onRefresh={onRefresh} refreshing={refreshing}>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 14 }}>
        <Pressable accessibilityRole="button" accessibilityLabel="Open your profile" onPress={() => router.push("/(student)/profile")}>
          <Avatar name={app.user?.name} uri={app.user?.avatarUrl} size={52} />
        </Pressable>
        <View style={{ gap: 3, flex: 1 }}>
          <Text accessibilityRole="header" style={{ color: colors.ink, fontSize: 24, lineHeight: 30, fontWeight: "800", letterSpacing: -0.6 }} numberOfLines={1}>{greeting}, {name}.</Text>
          <Text numberOfLines={2} style={{ color: colors.muted, fontSize: 13, lineHeight: 18 }}>{`A space shaped around ${focusLabel}.`}</Text>
        </View>
        <Pressable accessibilityRole="button" accessibilityLabel={unread ? `Notifications, ${unread} unread` : "Notifications"} onPress={() => go("notifications")} style={({ pressed }) => ({ width: 48, height: 48, backgroundColor: colors.surface, borderRadius: 16, alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: colors.line, opacity: pressed ? 0.8 : 1 })}>
          <Ionicons name="notifications-outline" size={22} color={colors.ink} />
          {unread > 0 ? (
            <View style={{ position: "absolute", right: 5, top: 5, minWidth: 18, height: 18, borderRadius: 9, paddingHorizontal: 4, backgroundColor: colors.primary, borderWidth: 1.5, borderColor: colors.white, alignItems: "center", justifyContent: "center" }}>
              <Text style={{ color: colors.white, fontSize: 10, fontWeight: "800" }}>{unread > 9 ? "9+" : unread}</Text>
            </View>
          ) : null}
        </Pressable>
      </View>

      {missingNin ? (
        <Pressable accessibilityRole="button" accessibilityLabel="Complete your profile: add your NIN" onPress={() => router.push("/(student)/profile")} style={({ pressed }) => ({ flexDirection: "row", alignItems: "center", gap: 12, backgroundColor: colors.warningBg, borderRadius: 18, padding: 14, opacity: pressed ? 0.9 : 1 })}>
          <Ionicons name="card-outline" size={22} color={colors.warning} />
          <View style={{ flex: 1, gap: 2 }}>
            <Text style={{ color: colors.ink, fontWeight: "800" }}>Complete your profile</Text>
            <Text style={{ color: colors.muted, fontSize: 13, lineHeight: 18 }}>Your NIN is now required. Add it in your profile.</Text>
          </View>
          <Ionicons name="chevron-forward" size={18} color={colors.warning} />
        </Pressable>
      ) : null}

      <HeroCard eyebrow="A thought for today" icon="sparkles-outline" title="Small steps still move you forward." body="You don’t have to figure everything out at once. Start with one thing you can do today.">
        <Pressable accessibilityRole="button" onPress={() => go("wellness")} style={{ flexDirection: "row", alignItems: "center", gap: 8, alignSelf: "flex-start", minHeight: 44 }}>
          <Text style={{ color: colors.mint, fontWeight: "800", fontSize: 14 }}>{checkedInToday ? `Checked in today: ${lastCheckin.mood} · See your week` : "Check in with yourself"}</Text>
          <Ionicons name="arrow-forward" size={16} color={colors.mint} />
        </Pressable>
      </HeroCard>

      <SectionHeader title="What do you need today?" subtitle="Choose a place to start." />
      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 12 }}>
        {quick.map(({ title, slug, icon }, index) => {
          const wide = quick.length % 2 === 1 && index === quick.length - 1;
          return (
            <Pressable
              key={slug}
              accessibilityRole="button"
              accessibilityLabel={title}
              onPress={() => go(slug)}
              style={({ pressed }) => ({
                flexBasis: wide ? "100%" : "47%", flexGrow: 1, minHeight: wide ? 76 : 128,
                backgroundColor: colors.surface, padding: 16, borderRadius: 20, borderWidth: 1, borderColor: colors.cardBorder,
                flexDirection: wide ? "row" : "column", alignItems: wide ? "center" : "stretch", justifyContent: wide ? "flex-start" : "space-between", gap: wide ? 14 : 16,
                ...shadows.card, opacity: pressed ? 0.9 : 1, transform: [{ scale: pressed ? 0.985 : 1 }],
              })}
            >
              <IconBadge icon={icon} size={44} />
              <Text style={{ color: colors.ink, fontWeight: "800", fontSize: 15, lineHeight: 20, flex: wide ? 1 : undefined }}>{title}</Text>
              {wide ? <Ionicons name="chevron-forward" size={18} color={colors.mutedLight} /> : null}
            </Pressable>
          );
        })}
      </View>

      {news.items.length ? <>
        <SectionHeader
          title="News & updates"
          subtitle={news.unseen ? `${news.unseen} new from the Mentorship+ team` : "From the Mentorship+ team"}
          actionLabel="See all"
          onAction={() => router.push("/news")}
        />
        <Card style={{ gap: 0, paddingVertical: 4 }}>
          {news.items.slice(0, 3).map((item) => <NewsCard key={item.id} compact item={item} isNew={isNewPost(item, news.lastSeenAt)} onPress={() => router.push({ pathname: "/news/[id]", params: { id: item.id } })} />)}
        </Card>
      </> : null}

      <SectionHeader
        title="Your next steps"
        subtitle={app.goals.length ? undefined : "Small goals make big days easier."}
        actionLabel={app.goals.length ? "Manage" : undefined}
        onAction={() => go("goals")}
        right={app.goals.length ? <Pill label={`${doneGoals}/${app.goals.length} done`} tone="green" /> : undefined}
      />
      <Card style={{ gap: 0, paddingVertical: app.goals.length ? 8 : 18 }}>
        {app.goals.length ? app.goals.slice(0, 3).map((g, i, list) => (
          <Pressable
            key={g.id}
            accessibilityRole="checkbox"
            accessibilityState={{ checked: g.done }}
            accessibilityLabel={g.title}
            onPress={() => { void app.toggleGoal(g.id).catch(error => AppAlert.alert("Goal not updated", error instanceof Error ? error.message : "Please try again.")); }}
            style={{ flexDirection: "row", alignItems: "center", gap: 12, minHeight: 52, paddingVertical: 8, borderBottomWidth: i < list.length - 1 ? 1 : 0, borderBottomColor: colors.line }}
          >
            <Ionicons name={g.done ? "checkmark-circle" : "ellipse-outline"} size={24} color={g.done ? colors.primary : colors.mutedLight} />
            <Text style={{ color: g.done ? colors.muted : colors.ink, textDecorationLine: g.done ? "line-through" : "none", flex: 1, lineHeight: 21, fontSize: 15 }}>{g.title}</Text>
          </Pressable>
        )) : (
          <View style={{ gap: 12, alignItems: "flex-start" }}>
            <Text style={{ color: colors.muted, lineHeight: 21 }}>You haven’t set any goals yet. Add one small thing you’d like to do this week.</Text>
            <Button title="Add a goal" variant="secondary" size="sm" icon="add" onPress={() => go("goals")} />
          </View>
        )}
      </Card>

      <SectionHeader
        title={isEducation ? "Learning opportunities" : isCareer ? "Career and business growth" : "Recommended for you"}
        subtitle={`Selected for ${focusLabel.toLowerCase()}.`}
        actionLabel="See all"
        onAction={() => go("resources")}
      />
      {(() => {
        const shown = isEducation || !isCareer ? app.resources : app.resources.filter(r => /career|business/i.test(r.category));
        const featured = shown.find(r => r.imageUrl) ?? shown[0] ?? null;
        const rest = shown.filter(r => r.id !== featured?.id).slice(0, 2);
        return <>
          {featured ? <FeaturedBanner eyebrow={featured.category} title={featured.title} subtitle={featured.readTime} imageUrl={featured.imageUrl} onPress={() => openContent("resource", featured.id)} /> : null}
          {(featured ? rest : shown.slice(0, 2)).map(r => <ResourceCard key={r.id} item={r} onPress={() => openContent("resource", r.id)} />)}
          {!shown.length ? <Card><Text style={{ color: colors.muted, lineHeight: 21 }}>New resources will appear here when administrators publish them.</Text></Card> : null}
        </>;
      })()}
      {app.scholarships.length > 0 && <>
        <SectionHeader title="Scholarships closing soon" subtitle="Published for your group." actionLabel="See all" onAction={() => go("scholarships")} />
        {[...app.scholarships].sort((a, b) => new Date(a.deadline).getTime() - new Date(b.deadline).getTime()).slice(0, 2).map(sch => <ScholarshipCard key={sch.id} item={sch} onPress={() => openContent("scholarship", sch.id)} />)}
      </>}
      {app.grants.length > 0 && <>
        <SectionHeader title="Grants for you" subtitle={`Selected for ${focusLabel.toLowerCase()}.`} actionLabel="See all" onAction={() => go("grants")} />
        {app.grants.slice(0, 2).map(grant => <GrantCard key={grant.id} item={grant} onPress={() => openContent("grant", grant.id)} />)}
      </>}
      {upcoming.length > 0 && <>
        <SectionHeader title="Upcoming appointments" actionLabel="View all" onAction={() => go("booking")} />
        <Card style={{ gap: 0, paddingVertical: 6 }}>
          {upcoming.map((b, i) => (
            <Pressable
              key={b.id}
              accessibilityRole="button"
              accessibilityLabel={`${b.topic}, ${formatDateTime(b.startsAt)}, ${humanize(b.status)}`}
              onPress={() => go("booking")}
              style={{ flexDirection: "row", alignItems: "center", gap: 12, minHeight: 64, paddingVertical: 10, borderBottomWidth: i < upcoming.length - 1 ? 1 : 0, borderBottomColor: colors.line }}
            >
              <IconBadge icon="calendar-outline" size={40} />
              <View style={{ flex: 1, gap: 2 }}>
                <Text style={{ color: colors.ink, fontWeight: "800" }}>{b.topic}</Text>
                <Text style={{ color: colors.muted, fontSize: 13 }}>{formatDateTime(b.startsAt)}</Text>
              </View>
              <Pill label={humanize(b.status)} tone={appointmentTone(b.status.toUpperCase())} />
            </Pressable>
          ))}
        </Card>
      </>}
    </Screen>
  );
}
