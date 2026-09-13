import type { ComponentProps } from "react";
import type { Ionicons } from "@expo/vector-icons";
import type { Href } from "expo-router";
import {
  CONSUMER_HOME_A11Y_LABEL,
  CONSUMER_HOME_HREF,
  CONSUMER_HOME_LABEL,
  CONSUMER_TODAY_A11Y_LABEL,
  CONSUMER_TODAY_HREF,
  CONSUMER_TODAY_LABEL,
} from "@/lib/navigation/consumerHome";
import { OLI_TAB_ROUTES } from "@/lib/navigation/tabRoutes";

/**
 * Stage 2 primary dock destinations.
 * Exhaustive union — handle every member when switching.
 */
export type PrimaryNavigationDestination = "home" | "today" | "plan" | "progress" | "you";

export type PrimaryNavigationAction = {
  kind: "tab";
  tabName: "dash" | "today" | "program" | "progress" | "you";
};

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
  today: CONSUMER_TODAY_HREF,
  plan: OLI_TAB_ROUTES.program as Href,
  progress: OLI_TAB_ROUTES.progress as Href,
  you: OLI_TAB_ROUTES.you as Href,
} as const satisfies Record<PrimaryNavigationDestination, Href>;

/**
 * Exactly five primary destinations. No detached FAB / menu sixth destination.
 * Order is the single source of truth for Expo tabs, floating pill, and tests.
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
    id: "today",
    label: CONSUMER_TODAY_LABEL,
    accessibilityLabel: CONSUMER_TODAY_A11Y_LABEL,
    testID: "oli-tab-today",
    icon: "sunny",
    iconOutline: "sunny-outline",
    action: { kind: "tab", tabName: "today" },
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

/** All five destinations render inside the pill. Alias kept for existing callers. */
export const PRIMARY_PILL_ITEMS = PRIMARY_NAVIGATION_ITEMS;

/** Labels that must never appear in the Stage 2 primary dock. */
export const PRIMARY_NAV_FORBIDDEN_LABELS = [
  "Dash",
  "Monitor",
  "Daily",
  "My Day",
  "Strength",
  "Cardio",
  "Nutrition",
  "Health",
  "Timeline",
  "Program",
  "Library",
  "Manage",
  "More",
  "Profile",
] as const;

export function assertNeverPrimaryDestination(x: never): never {
  throw new Error(`Unhandled primary navigation destination: ${String(x)}`);
}
