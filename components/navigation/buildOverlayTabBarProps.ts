import { Ionicons } from "@expo/vector-icons";
import type { Router } from "expo-router";
import type { Href } from "expo-router";
import type { BottomTabBarProps } from "@react-navigation/bottom-tabs";
import type { EdgeInsets } from "react-native-safe-area-context";
import React from "react";
import {
  PRIMARY_NAVIGATION_ITEMS,
  PRIMARY_NAV_TAB_HREFS,
  type PrimaryNavigationDestination,
} from "@/lib/navigation/primaryNavigationConfig";
import { resolvePrimaryNavActiveDestination } from "@/lib/navigation/resolvePrimaryNavActiveDestination";

function tabNameToDestination(name: string): PrimaryNavigationDestination | null {
  switch (name) {
    case "dash":
      return "home";
    case "program":
      return "plan";
    case "progress":
      return "progress";
    case "you":
      return "you";
    default:
      return null;
  }
}

/**
 * BottomTabBarProps for stack routes where the real tab navigator is not mounted.
 * Always the four analytics-first destinations.
 */
export function buildOverlayTabBarProps(
  router: Router,
  insets: EdgeInsets,
  options?: { pathname?: string | null; healthMenuOpen?: boolean },
): BottomTabBarProps {
  const pathname = options?.pathname ?? null;
  const active = resolvePrimaryNavActiveDestination({ pathname });

  const routes = PRIMARY_NAVIGATION_ITEMS.map((item) => ({
    key: `oli-overlay-${item.action.tabName}`,
    name: item.action.tabName,
  }));

  const focusedIndex = Math.max(
    0,
    PRIMARY_NAVIGATION_ITEMS.findIndex((i) => i.id === active),
  );

  const navigation = {
    emit: () => ({ defaultPrevented: false }),
    dispatch: (action: { type?: string; payload?: { name?: string } }) => {
      const a = action;
      if (a.type !== "NAVIGATE" || !a.payload?.name) return;
      const dest = tabNameToDestination(a.payload.name);
      if (!dest) return;
      router.push(PRIMARY_NAV_TAB_HREFS[dest] as Href);
    },
  } as unknown as BottomTabBarProps["navigation"];

  const descriptors = Object.fromEntries(
    PRIMARY_NAVIGATION_ITEMS.map((item) => {
      const key = `oli-overlay-${item.action.tabName}`;
      return [
        key,
        {
          route: { key, name: item.action.tabName },
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
      key: "oli-overlay-tabs",
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
