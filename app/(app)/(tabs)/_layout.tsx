// app/(app)/(tabs)/_layout.tsx
import React from "react";
import { Platform } from "react-native";
import { Tabs } from "expo-router";
import Ionicons from "@expo/vector-icons/Ionicons";

type TabCfg = {
  title: string;
  icon: [keyof typeof Ionicons.glyphMap, keyof typeof Ionicons.glyphMap];
};

const TABS: Record<string, TabCfg> = {
  "dash/index":      { title: "Dash",      icon: ["speedometer-outline", "speedometer"] },
  "workout/index":   { title: "Workout",   icon: ["barbell-outline", "barbell"] },
  "cardio/index":    { title: "Cardio",    icon: ["walk-outline", "walk"] },
  "nutrition/index": { title: "Nutrition", icon: ["restaurant-outline", "restaurant"] },
  "recovery/index":  { title: "Recovery",  icon: ["bed-outline", "bed"] },
} as const;

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={({ route }) => {
        const cfg = TABS[route.name as keyof typeof TABS];
        const [outline, filled] = cfg?.icon ?? ["ellipse-outline", "ellipse"];
        const label = cfg?.title ?? (route.name.split("/")[0] || "Tab");

        return {
          headerShown: false,
          tabBarShowLabel: true,
          tabBarLabel: label,
          tabBarIcon: ({ focused, color, size }) => (
            <Ionicons
              name={(focused ? filled : outline) as keyof typeof Ionicons.glyphMap}
              size={size}
              color={color}
            />
          ),
          tabBarLabelStyle: { fontSize: 11, marginBottom: 2 },
          tabBarStyle: {
            height: 60,
            paddingBottom: Platform.OS === "ios" ? 8 : 6,
            paddingTop: 4,
            paddingHorizontal: 16,
          },
          tabBarItemStyle: { marginHorizontal: 6 },
          lazy: true,
          freezeOnBlur: true,
        };
      }}
    >
      <Tabs.Screen name="dash/index" />
      <Tabs.Screen name="workout/index" />
      <Tabs.Screen name="cardio/index" />
      <Tabs.Screen name="nutrition/index" />
      <Tabs.Screen name="recovery/index" />
    </Tabs>
  );
}
