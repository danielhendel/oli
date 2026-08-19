import { useContext } from "react";
import { BottomTabBarHeightContext } from "@react-navigation/bottom-tabs/lib/module/utils/BottomTabBarHeightContext.js";
import * as SafeArea from "react-native-safe-area-context";
import {
  FLOATING_NAV_DOCK_BOTTOM_MARGIN,
  FLOATING_NAV_PILL_MIN_HEIGHT,
} from "@/lib/ui/navigation/floatingNavLayout";
import { FloatingNavChromeHeightContext } from "@/lib/ui/navigation/FloatingNavChromeHeightContext";

/** Extra breathing room above the dock so the last row is fully tappable. */
export const FLOATING_TAB_ROOT_SCROLL_EXTRA = 48;

/**
 * Overlay tab bars often report height `0` before layout (or forever when absolute).
 * Treat non-positive values as unset so we can fall back to stack chrome or a min dock.
 */
export function reportedFloatingChromeHeight(
  tabBarHeight: number | undefined,
  stackChromeHeight: number | undefined,
): number {
  if (typeof tabBarHeight === "number" && tabBarHeight > 0) return tabBarHeight;
  if (typeof stackChromeHeight === "number" && stackChromeHeight > 0) return stackChromeHeight;
  return 0;
}

export function resolveFloatingTabBarScrollPadding(input: {
  extra?: number | undefined;
  tabBarHeight?: number | undefined;
  stackChromeHeight?: number | undefined;
  safeAreaBottom?: number | undefined;
}): number {
  const extra = input.extra ?? FLOATING_TAB_ROOT_SCROLL_EXTRA;
  const reported = reportedFloatingChromeHeight(input.tabBarHeight, input.stackChromeHeight);
  const minDock =
    (input.safeAreaBottom ?? 0) + FLOATING_NAV_DOCK_BOTTOM_MARGIN + FLOATING_NAV_PILL_MIN_HEIGHT;
  return extra + Math.max(reported, minDock);
}

/**
 * Scroll/content bottom inset for screens under the floating bottom tab bar.
 * Uses tab navigator height when inside tabs, or stack floating chrome height on health stack routes.
 * Overlay tab bars that report `0` still get a minimum dock + safe-area clearance.
 */
export function useFloatingTabBarScrollPadding(extra = FLOATING_TAB_ROOT_SCROLL_EXTRA): number {
  const tabBarHeight = useContext(BottomTabBarHeightContext);
  const stackChromeHeight = useContext(FloatingNavChromeHeightContext);
  const insetsFn = SafeArea.useSafeAreaInsets;
  const safeAreaBottom = typeof insetsFn === "function" ? insetsFn().bottom : 0;
  return resolveFloatingTabBarScrollPadding({
    extra,
    tabBarHeight,
    stackChromeHeight,
    safeAreaBottom,
  });
}
