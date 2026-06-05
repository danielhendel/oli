import { Ionicons } from "@expo/vector-icons";
import type { Router } from "expo-router";
import type { Href } from "expo-router";
import type { BottomTabBarProps } from "@react-navigation/bottom-tabs";
import type { EdgeInsets } from "react-native-safe-area-context";
import React from "react";

const TAB_PUSH: Record<string, Href> = {
  dash: "/(app)/(tabs)/dash",
  timeline: "/(app)/(tabs)/timeline",
  program: "/(app)/(tabs)/program",
  library: "/(app)/(tabs)/library",
};

const ROUTE_LIST = [
  { name: "dash" as const, title: "Dash", a11y: "Dash", icon: "home" as const, iconOutline: "home-outline" as const },
  { name: "timeline" as const, title: "Timeline", a11y: "Timeline", icon: "time" as const, iconOutline: "time-outline" as const },
  { name: "program" as const, title: "Program", a11y: "Program", icon: "rocket" as const, iconOutline: "rocket-outline" as const },
  { name: "library" as const, title: "Library", a11y: "Library", icon: "book" as const, iconOutline: "book-outline" as const },
  { name: "manage" as const, title: "Manage", a11y: "Manage", icon: "apps" as const, iconOutline: "apps-outline" as const },
];

/**
 * BottomTabBarProps for the same four main tabs as `(tabs)/_layout`, used on stack health routes
 * where the real tab navigator is not mounted. `state.index` points at `manage` so no main tab
 * shows as selected (mirrors hidden Manage tab inside the real navigator).
 */
export function buildOverlayTabBarProps(router: Router, insets: EdgeInsets): BottomTabBarProps {
  const routes = ROUTE_LIST.map((r) => ({ key: `oli-overlay-${r.name}`, name: r.name }));
  const manageIndex = routes.length - 1;

  const navigation: BottomTabBarProps["navigation"] = {
    emit: (payload) => {
      if (payload.type === "tabPress" || payload.type === "tabLongPress") {
        return { defaultPrevented: false };
      }
      return { defaultPrevented: false };
    },
    dispatch: (action) => {
      const a = action as { type?: string; payload?: { name?: string } };
      if (a.type === "NAVIGATE" && a.payload?.name && a.payload.name in TAB_PUSH) {
        router.push(TAB_PUSH[a.payload.name]!);
      }
    },
  } as BottomTabBarProps["navigation"];

  const descriptors = Object.fromEntries(
    ROUTE_LIST.map((r) => {
      const key = `oli-overlay-${r.name}`;
      return [
        key,
        {
          route: { key, name: r.name },
          options: {
            title: r.title,
            tabBarAccessibilityLabel: r.a11y,
            tabBarIcon: ({
              color,
              size,
              focused,
            }: {
              color: string;
              size: number;
              focused: boolean;
            }) =>
              React.createElement(Ionicons, {
                name: (focused ? r.icon : r.iconOutline) as React.ComponentProps<typeof Ionicons>["name"],
                size: size ?? 24,
                color,
              }),
          },
          navigation: {} as never,
          render: () => null,
        },
      ];
    }),
  ) as unknown as BottomTabBarProps["descriptors"];

  return {
    state: {
      key: "oli-overlay-tabs",
      index: manageIndex,
      routeNames: routes.map((x) => x.name),
      routes,
      type: "tab",
      stale: false,
      history: [{ type: "route", key: routes[manageIndex]!.key }],
      preloadedRouteKeys: [],
    },
    descriptors,
    navigation,
    insets,
  };
}
