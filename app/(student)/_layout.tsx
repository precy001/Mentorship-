import { Tabs } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { ColorValue, View } from "react-native";
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
        tabBarStyle: {
          position: "absolute",
          left: 14,
          right: 14,
          bottom: Math.max(insets.bottom, 8),
          height: 68,
          paddingTop: 8,
          paddingBottom: 8,
          borderTopWidth: 0,
          borderWidth: 1,
          borderColor: "rgba(255,255,255,0.82)",
          borderRadius: 24,
          backgroundColor: "rgba(255,255,255,0.96)",
          elevation: 10,
          shadowColor: "#0F172A",
          shadowOpacity: 0.1,
          shadowRadius: 20,
          shadowOffset: { width: 0, height: 6 },
        },
        tabBarBackground: () => (
          <View
            pointerEvents="none"
            style={{
              flex: 1,
              borderRadius: 24,
              backgroundColor: colors.glass,
              borderWidth: 1,
              borderColor: colors.glassBorder,
            }}
          />
        ),
        tabBarLabelStyle: { fontSize: 11, fontWeight: "700", marginTop: 1 },
        tabBarItemStyle: { paddingVertical: 1 },
      }}
    >
      <Tabs.Screen name="index" options={{ title: "Home", tabBarAccessibilityLabel: "Home", tabBarIcon: tabIcon("home", "home-outline") }} />
      <Tabs.Screen name="explore" options={{ title: "Explore", tabBarAccessibilityLabel: "Explore resources and scholarships", tabBarIcon: tabIcon("compass", "compass-outline") }} />
      <Tabs.Screen name="counselling" options={{ title: "Support", tabBarAccessibilityLabel: "Counselling support", tabBarIcon: tabIcon("chatbubble-ellipses", "chatbubble-ellipses-outline") }} />
      <Tabs.Screen name="activities" options={{ title: "Activities", tabBarAccessibilityLabel: "Activities", tabBarIcon: tabIcon("leaf", "leaf-outline") }} />
      <Tabs.Screen name="profile" options={{ title: "Profile", tabBarAccessibilityLabel: "Profile", tabBarIcon: tabIcon("person", "person-outline") }} />
    </Tabs>
  );
}
