import { useContext } from "react";
import { BottomTabBarHeightContext } from "@react-navigation/bottom-tabs/lib/module/utils/BottomTabBarHeightContext.js";
import { FloatingNavChromeHeightContext } from "@/lib/ui/navigation/FloatingNavChromeHeightContext";

/**
 * Scroll/content bottom inset for screens under the floating bottom tab bar.
 * Uses tab navigator height when inside tabs, or stack floating chrome height on health stack routes.
 * Outside both (e.g. plain stack screens), only `extra` applies.
 */
export function useFloatingTabBarScrollPadding(extra = 40): number {
  const tabBarHeight = useContext(BottomTabBarHeightContext);
  const stackChromeHeight = useContext(FloatingNavChromeHeightContext);
  const inset = tabBarHeight ?? stackChromeHeight ?? 0;
  return extra + inset;
}
