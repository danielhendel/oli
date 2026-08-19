import type { ComponentProps } from "react";
import type { Ionicons } from "@expo/vector-icons";
import type { Href } from "expo-router";
import { CONSUMER_HOME_A11Y_LABEL, CONSUMER_HOME_HREF, CONSUMER_HOME_LABEL } from "@/lib/navigation/consumerHome";
import { OLI_TAB_ROUTES } from "@/lib/navigation/tabRoutes";

/**
 * Analytics-first primary dock destinations.
 * Exhaustive union — handle every member when switching.
 */
export type PrimaryNavigationDestination = "home" | "plan" | "progress" | "you";

export type PrimaryNavigationAction = { kind: "tab"; tabName: "dash" | "program" | "progress" | "you" };

export type PrimaryNavigationItem = {
  id: PrimaryNavigationDestination;
  label: string;
  accessibilityLabel: string;
  accessibilityHint?: string;
  testID: string;
  icon: ComponentProps<typeof Ionicons>["name"];
  iconOutline: ComponentProps<typeof Ionicons>["name"];
  action: PrimaryNavigationAction;
};

/** Canonical Home filesystem href. User-facing name is Home, not Dash. */
export const PRIMARY_NAV_DASH_HREF = CONSUMER_HOME_HREF;

export const PRIMARY_NAV_TAB_HREFS = {
  home: CONSUMER_HOME_HREF,
  plan: OLI_TAB_ROUTES.program as Href,
  progress: OLI_TAB_ROUTES.progress as Href,
  you: OLI_TAB_ROUTES.you as Href,
} as const satisfies Record<PrimaryNavigationDestination, Href>;

/**
 * Exactly four primary destinations. No detached FAB / menu fifth destination.
 */
export const PRIMARY_NAVIGATION_ITEMS: readonly PrimaryNavigationItem[] = [
  {
    id: "home",
    label: CONSUMER_HOME_LABEL,
    accessibilityLabel: CONSUMER_HOME_A11Y_LABEL,
    testID: "oli-tab-home",
    icon: "home",
    iconOutline: "home-outline",
    action: { kind: "tab", tabName: "dash" },
  },
  {
    id: "plan",
    label: "Plan",
    accessibilityLabel: "Plan",
    testID: "oli-tab-plan",
    icon: "clipboard",
    iconOutline: "clipboard-outline",
    action: { kind: "tab", tabName: "program" },
  },
  {
    id: "progress",
    label: "Progress",
    accessibilityLabel: "Progress",
    testID: "oli-tab-progress",
    icon: "trending-up",
    iconOutline: "trending-up-outline",
    action: { kind: "tab", tabName: "progress" },
  },
  {
    id: "you",
    label: "You",
    accessibilityLabel: "You",
    testID: "oli-tab-you",
    icon: "person",
    iconOutline: "person-outline",
    action: { kind: "tab", tabName: "you" },
  },
] as const;

/** All four destinations render inside the pill. Alias kept for existing callers. */
export const PRIMARY_PILL_ITEMS = PRIMARY_NAVIGATION_ITEMS;

/** Labels that must never appear in the analytics-first primary dock. */
export const PRIMARY_NAV_FORBIDDEN_LABELS = [
  "Today",
  "Dash",
  "Monitor",
  "Strength",
  "Cardio",
  "Nutrition",
  "Health",
  "Timeline",
  "Program",
  "Library",
  "Manage",
  "More",
] as const;

export function assertNeverPrimaryDestination(x: never): never {
  throw new Error(`Unhandled primary navigation destination: ${String(x)}`);
}
