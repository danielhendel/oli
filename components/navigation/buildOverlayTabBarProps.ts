import { Ionicons } from "@expo/vector-icons";
import type { Router } from "expo-router";
import type { Href } from "expo-router";
import type { BottomTabBarProps } from "@react-navigation/bottom-tabs";
import type { EdgeInsets } from "react-native-safe-area-context";
import React from "react";
import { isPrimaryNavHealthV1Enabled } from "@/lib/navigation/primaryNavHealthV1";
import {
  PRIMARY_NAVIGATION_ITEMS,
  PRIMARY_NAV_DASH_HREF,
  PRIMARY_NAV_STACK_HREFS,
} from "@/lib/navigation/primaryNavigationConfig";
import { resolvePrimaryNavActiveDestination } from "@/lib/navigation/resolvePrimaryNavActiveDestination";
import {
  DAILY_MONITOR_TAB_A11Y_LABEL,
  DAILY_MONITOR_TAB_TITLE,
  isDashDailyMonitorFoundationEnabled,
} from "@/lib/data/dash/dashDailyMonitorFoundation";
import { isDashWeeklyProgressRelocationEnabled } from "@/lib/data/dash/dashWeeklyProgressRelocation";
import { resolveDashExperienceMode } from "@/lib/data/dash/resolveDashExperienceMode";

const LEGACY_TAB_PUSH: Record<string, Href> = {
  dash: "/(app)/(tabs)/dash",
  timeline: "/(app)/(tabs)/timeline",
  program: "/(app)/(tabs)/program",
  library: "/(app)/(tabs)/library",
};

const LEGACY_ROUTE_LIST = [
  { name: "dash" as const, title: "Dash", a11y: "Dash", icon: "home" as const, iconOutline: "home-outline" as const },
  { name: "timeline" as const, title: "Timeline", a11y: "Timeline", icon: "time" as const, iconOutline: "time-outline" as const },
  { name: "program" as const, title: "Program", a11y: "Program", icon: "rocket" as const, iconOutline: "rocket-outline" as const },
  { name: "library" as const, title: "Library", a11y: "Library", icon: "book" as const, iconOutline: "book-outline" as const },
  { name: "manage" as const, title: "Manage", a11y: "Manage", icon: "apps" as const, iconOutline: "apps-outline" as const },
];

function legacyDashTitles(): { title: string; a11y: string } {
  const dashExperience = resolveDashExperienceMode({
    dailyMonitorEnabled: isDashDailyMonitorFoundationEnabled(),
    weeklyProgressRelocationEnabled: isDashWeeklyProgressRelocationEnabled(),
  });
  if (dashExperience === "daily_monitor") {
    return { title: DAILY_MONITOR_TAB_TITLE, a11y: DAILY_MONITOR_TAB_A11Y_LABEL };
  }
  return { title: "Dash", a11y: "Dash" };
}

/**
 * BottomTabBarProps for stack health routes where the real tab navigator is not mounted.
 *
 * Legacy: four main tabs + synthetic `manage` focus (no pill tab selected).
 * Health v1: five primary destinations with pathname-based selection.
 */
export function buildOverlayTabBarProps(
  router: Router,
  insets: EdgeInsets,
  options?: { pathname?: string | null; healthMenuOpen?: boolean },
): BottomTabBarProps {
  if (isPrimaryNavHealthV1Enabled()) {
    return buildHealthOverlayTabBarProps(router, insets, options);
  }
  return buildLegacyOverlayTabBarProps(router, insets);
}

function buildLegacyOverlayTabBarProps(router: Router, insets: EdgeInsets): BottomTabBarProps {
  const dashTitles = legacyDashTitles();
  const routeList = LEGACY_ROUTE_LIST.map((r) =>
    r.name === "dash" ? { ...r, title: dashTitles.title, a11y: dashTitles.a11y } : r,
  );
  const routes = routeList.map((r) => ({ key: `oli-overlay-${r.name}`, name: r.name }));
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
      if (a.type === "NAVIGATE" && a.payload?.name && a.payload.name in LEGACY_TAB_PUSH) {
        router.push(LEGACY_TAB_PUSH[a.payload.name]!);
      }
    },
  } as BottomTabBarProps["navigation"];

  const descriptors = Object.fromEntries(
    routeList.map((r) => {
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

function buildHealthOverlayTabBarProps(
  router: Router,
  insets: EdgeInsets,
  options?: { pathname?: string | null; healthMenuOpen?: boolean },
): BottomTabBarProps {
  const pathname = options?.pathname ?? null;
  const active = resolvePrimaryNavActiveDestination({
    pathname,
    healthMenuOpen: options?.healthMenuOpen ?? false,
  });

  const routes = PRIMARY_NAVIGATION_ITEMS.map((item) => ({
    key: `oli-overlay-${item.id}`,
    name: item.id,
  }));

  // Synthetic focus index for descriptors; OliBottomNav (health) uses pathname resolver.
  const focusedIndex = Math.max(
    0,
    PRIMARY_NAVIGATION_ITEMS.findIndex((i) => i.id === active),
  );

  const navigation = {
    emit: () => ({ defaultPrevented: false }),
    dispatch: (action: { type?: string; payload?: { name?: string } }) => {
      const a = action;
      if (a.type !== "NAVIGATE" || !a.payload?.name) return;
      const name = a.payload.name;
      if (name === "dash") {
        router.push(PRIMARY_NAV_DASH_HREF as Href);
        return;
      }
      if (name === "strength" || name === "cardio" || name === "nutrition") {
        router.push(PRIMARY_NAV_STACK_HREFS[name]);
      }
    },
  } as unknown as BottomTabBarProps["navigation"];

  const descriptors = Object.fromEntries(
    PRIMARY_NAVIGATION_ITEMS.map((item) => {
      const key = `oli-overlay-${item.id}`;
      return [
        key,
        {
          route: { key, name: item.id },
          options: {
            title: item.label,
            tabBarAccessibilityLabel: item.accessibilityLabel,
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
                name: focused ? item.icon : item.iconOutline,
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
      key: "oli-overlay-tabs-health",
      index: focusedIndex,
      routeNames: routes.map((x) => x.name),
      routes,
      type: "tab",
      stale: false,
      history: [{ type: "route", key: routes[focusedIndex]!.key }],
      preloadedRouteKeys: [],
    },
    descriptors,
    navigation,
    insets,
  };
}
