// app/(app)/(tabs)/_layout.tsx
import React, { useMemo } from "react";
import { View } from "react-native";
import { Tabs } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import type { BottomTabBarProps } from "@react-navigation/bottom-tabs";
import { FloatingNavigationChrome } from "@/components/navigation/FloatingNavigationChrome";
import {
  ManageNavigationProvider,
  useManageNavigation,
} from "@/components/navigation/ManageNavigationContext";
import {
  CONSUMER_HOME_A11Y_LABEL,
  CONSUMER_HOME_LABEL,
} from "@/lib/navigation/consumerHome";
import { isPrimaryNavHealthV1Enabled } from "@/lib/navigation/primaryNavHealthV1";
import { UI_APP_SCREEN_BG, UI_NAV_TAB_ICON_ACTIVE, UI_NAV_TAB_ICON_INACTIVE } from "@/lib/ui/theme/uiTokens";
import { ThemeProvider } from "@react-navigation/native";
import { createOliTabNavigationTheme } from "@/lib/ui/theme/oliTheme";
export { createOliTabNavigationTheme };

/**
 * Transparent tab bar chrome — avoids default gray strip behind custom tab UI. Exported for tests.
 * `sceneStyle` overrides React Navigation `Screen` → `Background` (defaults to theme `colors.background`,
 * typically white/system gray), so the area behind the floating bar matches tab roots (`UI_APP_SCREEN_BG`).
 */
export const OLI_TAB_SCREEN_OPTIONS = {
  headerShown: false,
  tabBarActiveTintColor: UI_NAV_TAB_ICON_ACTIVE,
  tabBarInactiveTintColor: UI_NAV_TAB_ICON_INACTIVE,
  tabBarLabelStyle: { fontSize: 12, fontWeight: "600" as const },
  sceneStyle: {
    backgroundColor: UI_APP_SCREEN_BG,
  },
  tabBarStyle: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "transparent",
    borderTopWidth: 0,
    borderTopColor: "transparent",
    elevation: 0,
    shadowOpacity: 0,
    shadowRadius: 0,
    shadowOffset: { width: 0, height: 0 },
  },
} as const;

function OliTabBar(props: BottomTabBarProps) {
  const { manageVisible, menuAnchor, openManage, closeManage } = useManageNavigation();
  return (
    <FloatingNavigationChrome
      tabBarProps={props}
      manageVisible={manageVisible}
      menuAnchor={menuAnchor}
      openManage={openManage}
      closeManage={closeManage}
    />
  );
}

function TabsLayoutInner() {
  const tabTheme = useMemo(() => createOliTabNavigationTheme(), []);
  const healthV1 = isPrimaryNavHealthV1Enabled();
  // Stage 1B: Today is the sole consumer home label (filesystem route remains dash).
  const dashTabTitle = CONSUMER_HOME_LABEL;
  const dashTabA11y = CONSUMER_HOME_A11Y_LABEL;

  // Hide Timeline/Program/Library from the Expo Router tab bar when Health v1 is on.
  // Routes remain registered for deep links and Settings → Explore.
  const hiddenTabOptions = healthV1 ? ({ href: null } as const) : {};

  return (
    <View style={{ flex: 1, backgroundColor: UI_APP_SCREEN_BG }}>
      <ThemeProvider value={tabTheme}>
        <Tabs initialRouteName="dash" tabBar={(props) => <OliTabBar {...props} />} screenOptions={OLI_TAB_SCREEN_OPTIONS}>
          <Tabs.Screen
            name="dash"
            options={{
              title: dashTabTitle,
              tabBarAccessibilityLabel: dashTabA11y,
              tabBarIcon: ({ color, size, focused }) => (
                <Ionicons name={focused ? "home" : "home-outline"} size={size ?? 24} color={color} />
              ),
            }}
          />
          <Tabs.Screen
            name="timeline"
            options={{
              title: "Timeline",
              tabBarAccessibilityLabel: "Timeline",
              tabBarIcon: ({ color, size, focused }) => (
                <Ionicons name={focused ? "time" : "time-outline"} size={size ?? 24} color={color} />
              ),
              ...hiddenTabOptions,
            }}
          />
          <Tabs.Screen
            name="program"
            options={{
              title: "Program",
              tabBarAccessibilityLabel: "Program",
              tabBarIcon: ({ color, size, focused }) => (
                <Ionicons
                  name={focused ? "rocket" : "rocket-outline"}
                  size={size ?? 24}
                  color={color}
                />
              ),
              ...hiddenTabOptions,
            }}
          />
          <Tabs.Screen
            name="library"
            options={{
              title: "Library",
              tabBarAccessibilityLabel: "Library",
              tabBarIcon: ({ color, size, focused }) => (
                <Ionicons name={focused ? "book" : "book-outline"} size={size ?? 24} color={color} />
              ),
              ...hiddenTabOptions,
            }}
          />
        </Tabs>
      </ThemeProvider>
    </View>
  );
}

export default function TabsLayout() {
  return (
    <ManageNavigationProvider>
      <TabsLayoutInner />
    </ManageNavigationProvider>
  );
}
