import type { ComponentProps } from "react";
import type { Ionicons } from "@expo/vector-icons";
import type { Href } from "expo-router";
import { OLI_TAB_ROUTES } from "@/lib/navigation/tabRoutes";

/**
 * Phase 2G-A primary dock destinations (health-focused navigation).
 * Exhaustive union — handle every member when switching.
 */
export type PrimaryNavigationDestination =
  | "dash"
  | "strength"
  | "cardio"
  | "nutrition"
  | "health";

export type PrimaryNavigationAction =
  | { kind: "tab"; tabName: "dash" }
  | { kind: "href"; href: Href }
  | { kind: "menu" };

export type PrimaryNavigationItem = {
  id: PrimaryNavigationDestination;
  label: string;
  accessibilityLabel: string;
  /** Extra VoiceOver hint when the destination opens a menu instead of navigating. */
  accessibilityHint?: string;
  testID: string;
  icon: ComponentProps<typeof Ionicons>["name"];
  iconOutline: ComponentProps<typeof Ionicons>["name"];
  action: PrimaryNavigationAction;
};

/** Canonical stack hrefs for Strength / Cardio / Nutrition landings (reuse existing routes). */
export const PRIMARY_NAV_STACK_HREFS = {
  strength: "/(app)/workouts",
  cardio: "/(app)/cardio",
  nutrition: "/(app)/nutrition",
} as const satisfies Record<"strength" | "cardio" | "nutrition", Href>;

export const PRIMARY_NAV_DASH_HREF = OLI_TAB_ROUTES.dash;

/**
 * Four direct destinations inside the primary navigation pill.
 * Health is intentionally excluded — it renders as a detached circular control.
 */
export const PRIMARY_PILL_ITEMS: readonly PrimaryNavigationItem[] = [
  {
    id: "dash",
    label: "Dash",
    accessibilityLabel: "Dash",
    testID: "oli-tab-dash",
    icon: "home",
    iconOutline: "home-outline",
    action: { kind: "tab", tabName: "dash" },
  },
  {
    id: "strength",
    label: "Strength",
    accessibilityLabel: "Strength",
    testID: "oli-tab-strength",
    icon: "barbell",
    iconOutline: "barbell-outline",
    action: { kind: "href", href: PRIMARY_NAV_STACK_HREFS.strength },
  },
  {
    id: "cardio",
    label: "Cardio",
    accessibilityLabel: "Cardio",
    testID: "oli-tab-cardio",
    icon: "bicycle",
    iconOutline: "bicycle-outline",
    action: { kind: "href", href: PRIMARY_NAV_STACK_HREFS.cardio },
  },
  {
    id: "nutrition",
    label: "Nutrition",
    accessibilityLabel: "Nutrition",
    testID: "oli-tab-nutrition",
    icon: "restaurant",
    iconOutline: "restaurant-outline",
    action: { kind: "href", href: PRIMARY_NAV_STACK_HREFS.nutrition },
  },
] as const;

/**
 * Detached Health control (menu action — not a fake route).
 * Renders beside the pill, reusing Manage/FAB visual grammar.
 */
export const HEALTH_NAV_ITEM: PrimaryNavigationItem = {
  id: "health",
  label: "Health",
  accessibilityLabel: "Health",
  accessibilityHint: "Opens the Health menu",
  testID: "oli-health-fab",
  icon: "heart",
  iconOutline: "heart-outline",
  action: { kind: "menu" },
};

/**
 * Full primary navigation system order (pill destinations + detached Health).
 * Prefer {@link PRIMARY_PILL_ITEMS} + {@link HEALTH_NAV_ITEM} for layout.
 */
export const PRIMARY_NAVIGATION_ITEMS: readonly PrimaryNavigationItem[] = [
  ...PRIMARY_PILL_ITEMS,
  HEALTH_NAV_ITEM,
] as const;

/** Labels that must never appear in the Phase 2G-A primary dock. */
export const PRIMARY_NAV_FORBIDDEN_LABELS = [
  "Monitor",
  "Timeline",
  "Program",
  "Library",
  "Manage",
  "More",
] as const;

export function assertNeverPrimaryDestination(x: never): never {
  throw new Error(`Unhandled primary navigation destination: ${String(x)}`);
}
