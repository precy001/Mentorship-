import { Tabs } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { ColorValue } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { colors } from "@/src/lib/theme";

type IconName = React.ComponentProps<typeof Ionicons>["name"];

/** Filled icon when the tab is focused, outline otherwise, so the active tab is clear without relying on colour alone. */
const tabIcon = (active: IconName, inactive: IconName) =>
  function TabIcon({ color, size, focused }: { color: ColorValue; size: number; focused: boolean }) {
    return <Ionicons name={focused ? active : inactive} color={color} size={size} />;
  };

export default function StudentLayout() {
  const insets = useSafeAreaInsets();
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        sceneStyle: { backgroundColor: colors.bg },
        tabBarActiveTintColor: colors.primary,
        // Darker than the previous light grey so inactive labels meet contrast guidance.
        tabBarInactiveTintColor: colors.muted,
        tabBarHideOnKeyboard: true,
        // A solid bar docked to the bottom edge. The earlier floating, semi-transparent bar let page content
        // (photos in particular) show through and around it on Android.
        tabBarStyle: {
          height: 62 + insets.bottom,
          paddingTop: 6,
          paddingBottom: Math.max(insets.bottom, 8),
          backgroundColor: colors.surface,
          borderTopWidth: 1,
          borderTopColor: colors.line,
          elevation: 0,
          shadowOpacity: 0,
        },
        tabBarLabelStyle: { fontSize: 11, fontWeight: "700", marginTop: 1 },
        tabBarItemStyle: { paddingVertical: 1 },
      }}
    >
      <Tabs.Screen name="index" options={{ title: "Home", tabBarAccessibilityLabel: "Home", tabBarIcon: tabIcon("home", "home-outline") }} />
      <Tabs.Screen name="explore" options={{ title: "Explore", tabBarAccessibilityLabel: "Explore resources, scholarships and grants", tabBarIcon: tabIcon("compass", "compass-outline") }} />
      <Tabs.Screen name="counselling" options={{ title: "Support", tabBarAccessibilityLabel: "Counselling support", tabBarIcon: tabIcon("chatbubble-ellipses", "chatbubble-ellipses-outline") }} />
      <Tabs.Screen name="activities" options={{ title: "Activities", tabBarAccessibilityLabel: "Activities", tabBarIcon: tabIcon("leaf", "leaf-outline") }} />
      <Tabs.Screen name="profile" options={{ title: "Profile", tabBarAccessibilityLabel: "Profile", tabBarIcon: tabIcon("person", "person-outline") }} />
    </Tabs>
  );
}
