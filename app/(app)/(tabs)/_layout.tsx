// app/(app)/(tabs)/_layout.tsx
import { Tabs } from "expo-router";
import { Ionicons } from "@expo/vector-icons";

export default function TabsLayout() {
  return (
    <Tabs
      initialRouteName="dash"
      screenOptions={{
        headerShown: false,
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
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="home-outline" size={size ?? 24} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="timeline"
        options={{
          title: "Timeline",
          tabBarAccessibilityLabel: "Timeline",
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="time-outline" size={size ?? 24} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="manage"
        options={{
          title: "Manage",
          tabBarAccessibilityLabel: "Manage",
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="add-circle-outline" size={size ?? 24} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="library"
        options={{
          title: "Library",
          tabBarAccessibilityLabel: "Library",
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="book-outline" size={size ?? 24} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="stats"
        options={{
          title: "Stats",
          tabBarAccessibilityLabel: "Stats",
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="bar-chart-outline" size={size ?? 24} color={color} />
          ),
        }}
      />

      {/* Hide the group index route from the tab bar */}
    </Tabs>
  );
}
