// app/(app)/(tabs)/_layout.tsx
import React, { useCallback, useMemo, useState } from "react";
import { View } from "react-native";
import { Tabs } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import type { BottomTabBarProps } from "@react-navigation/bottom-tabs";
import { FloatingNavigationChrome } from "@/components/navigation/FloatingNavigationChrome";
import type { ManageMenuAnchor } from "@/components/navigation/ManageMenu";
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

type OliTabBarProps = BottomTabBarProps & {
  manageVisible: boolean;
  menuAnchor: ManageMenuAnchor | null;
  openManage: (anchor: ManageMenuAnchor) => void;
  closeManage: () => void;
};

function OliTabBar({
  manageVisible,
  menuAnchor,
  openManage,
  closeManage,
  ...tabProps
}: OliTabBarProps) {
  return (
    <FloatingNavigationChrome
      tabBarProps={tabProps}
      manageVisible={manageVisible}
      menuAnchor={menuAnchor}
      openManage={openManage}
      closeManage={closeManage}
    />
  );
}

export default function TabsLayout() {
  const tabTheme = useMemo(() => createOliTabNavigationTheme(), []);
  const [manageVisible, setManageVisible] = useState(false);
  const [menuAnchor, setMenuAnchor] = useState<ManageMenuAnchor | null>(null);

  const openManage = useCallback((anchor: ManageMenuAnchor) => {
    setMenuAnchor(anchor);
    setManageVisible(true);
  }, []);

  const closeManage = useCallback(() => {
    setManageVisible(false);
    setMenuAnchor(null);
  }, []);

  return (
    <View style={{ flex: 1, backgroundColor: UI_APP_SCREEN_BG }}>
      <ThemeProvider value={tabTheme}>
        <Tabs
          initialRouteName="dash"
          tabBar={(props) => (
            <OliTabBar
              {...props}
              manageVisible={manageVisible}
              menuAnchor={menuAnchor}
              openManage={openManage}
              closeManage={closeManage}
            />
          )}
          screenOptions={OLI_TAB_SCREEN_OPTIONS}
        >
          <Tabs.Screen
            name="dash"
            options={{
              title: "Dash",
              tabBarAccessibilityLabel: "Dash",
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
            }}
          />
          <Tabs.Screen
            name="profile"
            options={{
              title: "Profile",
              tabBarAccessibilityLabel: "Profile",
              tabBarIcon: ({ color, size, focused }) => (
                <Ionicons
                  name={focused ? "person-circle" : "person-circle-outline"}
                  size={size ?? 24}
                  color={color}
                />
              ),
            }}
          />
          <Tabs.Screen
            name="manage"
            options={{
              href: null,
              title: "Manage",
            }}
          />
        </Tabs>
      </ThemeProvider>
    </View>
  );
}
