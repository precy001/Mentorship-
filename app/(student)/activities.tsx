import React from "react";
import { router } from "expo-router";
import { Screen, Heading, SectionHeader, ListGroup, ListRow, type IconName, BackLink } from "@/src/components/UI";
import { backToHome } from "@/src/lib/routes";

type Activity = { title: string; description: string; slug: string; icon: IconName };

const GROUPS: { title: string; subtitle: string; items: Activity[] }[] = [
  {
    title: "Grow",
    subtitle: "Explore your interests and build small habits.",
    items: [
      { title: "Career assessment", description: "Understand your interests and explore career matches.", slug: "assessment", icon: "compass-outline" },
      { title: "Personal goals", description: "Build small routines and celebrate progress.", slug: "goals", icon: "checkmark-done-outline" },
    ],
  },
  {
    title: "Look after yourself",
    subtitle: "Check in and reach out when you need to.",
    items: [
      { title: "Wellbeing check-in", description: "Pause, name how you feel, and keep track over time.", slug: "wellness", icon: "heart-outline" },
      { title: "Counselling discussions", description: "Start or continue a private discussion with your assigned mentor.", slug: "counselling", icon: "chatbubble-ellipses-outline" },
      { title: "My appointments", description: "Request a session and manage upcoming or past appointments.", slug: "booking", icon: "calendar-outline" },
    ],
  },
  {
    title: "Keep track",
    subtitle: "Updates and everything you’ve done so far.",
    items: [
      { title: "Notifications", description: "See reminders and updates in one place.", slug: "notifications", icon: "notifications-outline" },
      { title: "Activity history", description: "Review your completed activities, check-ins, goals and appointments.", slug: "history", icon: "time-outline" },
    ],
  },
];

export default function Activities() {
  const go = (slug: string) => slug === "counselling" ? router.push("/(student)/counselling") : router.push({ pathname: "/feature/[slug]", params: { slug } });
  return (
    <Screen tabBar>
      <BackLink onPress={backToHome} />
      <Heading title="Activities" subtitle="Small actions that can help you move forward." />
      {GROUPS.map((group) => (
        <React.Fragment key={group.title}>
          <SectionHeader title={group.title} subtitle={group.subtitle} />
          <ListGroup>
            {group.items.map((item, index) => (
              <ListRow key={item.slug} icon={item.icon} title={item.title} subtitle={item.description} last={index === group.items.length - 1} onPress={() => go(item.slug)} />
            ))}
          </ListGroup>
        </React.Fragment>
      ))}
    </Screen>
  );
}
