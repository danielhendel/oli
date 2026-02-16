// app/(app)/(tabs)/_layout.tsx
import { Pressable, StyleSheet } from "react-native";
import { Tabs, useRouter } from "expo-router";
import Ionicons from "@expo/vector-icons/Ionicons";

const ICON_SIZE = 24;
const TOUCH_TARGET = 44;

function SettingsHeaderButton() {
  const router = useRouter();
  return (
    <Pressable
      onPress={() => router.push("/(app)/settings")}
      accessibilityRole="button"
      accessibilityLabel="Settings"
      hitSlop={10}
      style={({ pressed }) => [styles.settingsBtn, pressed && styles.settingsBtnPressed]}
    >
      <Ionicons name="settings-outline" size={ICON_SIZE} color="#1C1C1E" />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  settingsBtn: {
    minWidth: TOUCH_TARGET,
    minHeight: TOUCH_TARGET,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 4,
  },
  settingsBtnPressed: {
    opacity: 0.6,
  },
});

export default function TabsLayout() {
  return (
    <Tabs
      initialRouteName="dash"
      screenOptions={{
        headerShown: true,
        headerRight: () => <SettingsHeaderButton />,
        headerTitleStyle: { fontWeight: "700", fontSize: 17 },
        tabBarActiveTintColor: "#1C1C1E",
        tabBarInactiveTintColor: "#8E8E93",
        tabBarLabelStyle: { fontSize: 12, fontWeight: "600" },
      }}
    >
      {/* Left → right: Dash, Timeline, Manage, Library, Stats */}
      <Tabs.Screen
        name="dash"
        options={{
          title: "Dash",
          tabBarAccessibilityLabel: "Dash",
        }}
      />
      <Tabs.Screen
        name="timeline"
        options={{
          title: "Timeline",
          tabBarAccessibilityLabel: "Timeline",
        }}
      />
      <Tabs.Screen
        name="manage"
        options={{
          title: "Manage",
          tabBarAccessibilityLabel: "Manage",
        }}
      />
      <Tabs.Screen
        name="library"
        options={{
          title: "Library",
          tabBarAccessibilityLabel: "Library",
        }}
      />
      <Tabs.Screen
        name="stats"
        options={{
          title: "Stats",
          tabBarAccessibilityLabel: "Stats",
        }}
      />

      {/* Hide the group index route from the tab bar */}
    </Tabs>
  );
}
