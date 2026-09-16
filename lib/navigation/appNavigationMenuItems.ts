// lib/navigation/appNavigationMenuItems.ts
import type { Href } from "expo-router";
import {
  HEALTH_PERFORMANCE_CATEGORY_DEFINITIONS,
  type HealthPerformanceCategoryId,
} from "@/lib/home/healthPerformanceCategories";
import {
  PRIMARY_NAVIGATION_ITEMS,
  type PrimaryNavigationDestination,
} from "@/lib/navigation/primaryNavigationConfig";

export type AppNavigationMenuItemKind = "primary" | "href";

export type AppNavigationMenuItem = {
  id: string;
  label: string;
  accessibilityLabel: string;
  testID: string;
} & (
  | { kind: "primary"; destination: PrimaryNavigationDestination }
  | { kind: "href"; href: Href }
);

export type AppNavigationMenuSection = {
  id: string;
  title: string;
  items: readonly AppNavigationMenuItem[];
};

const MAIN_SECTION: AppNavigationMenuSection = {
  id: "main",
  title: "Main",
  items: PRIMARY_NAVIGATION_ITEMS.map((item) => ({
    id: `main-${item.id}`,
    label: item.label,
    accessibilityLabel: item.accessibilityLabel,
    testID: `app-nav-drawer-${item.id}`,
    kind: "primary" as const,
    destination: item.id,
  })),
};

const HEALTH_SECTION: AppNavigationMenuSection = {
  id: "health_performance",
  title: "Health & Performance",
  items: HEALTH_PERFORMANCE_CATEGORY_DEFINITIONS.map(
    (def: { id: HealthPerformanceCategoryId; label: string; href: Href }) => ({
      id: `category-${def.id}`,
      label: def.label,
      accessibilityLabel: def.label,
      testID: `app-nav-drawer-category-${def.id}`,
      kind: "href" as const,
      href: def.href,
    }),
  ),
};

const ACCOUNT_SECTION: AppNavigationMenuSection = {
  id: "account_data",
  title: "Account & Data",
  items: [
    {
      id: "devices",
      label: "Connected devices",
      accessibilityLabel: "Connected devices",
      testID: "app-nav-drawer-devices",
      kind: "href",
      href: "/(app)/settings/devices" as Href,
    },
    {
      id: "assessments",
      label: "Assessments",
      accessibilityLabel: "Assessments",
      testID: "app-nav-drawer-assessments",
      kind: "href",
      href: "/(app)/profile/health-assessment" as Href,
    },
    {
      id: "labs",
      label: "Labs",
      accessibilityLabel: "Labs",
      testID: "app-nav-drawer-labs",
      kind: "href",
      href: "/(app)/labs" as Href,
    },
    {
      id: "your-data",
      label: "Your Data",
      accessibilityLabel: "Your Data",
      testID: "app-nav-drawer-your-data",
      kind: "href",
      href: "/(app)/settings/your-data" as Href,
    },
    {
      id: "privacy",
      label: "Privacy",
      accessibilityLabel: "Privacy",
      testID: "app-nav-drawer-privacy",
      kind: "href",
      href: "/(app)/settings/privacy" as Href,
    },
    {
      id: "settings",
      label: "Settings",
      accessibilityLabel: "Settings",
      testID: "app-nav-drawer-settings",
      kind: "href",
      href: "/(app)/settings" as Href,
    },
  ],
};

/** Launch-facing drawer sections — implemented destinations only. */
export const APP_NAVIGATION_MENU_SECTIONS: readonly AppNavigationMenuSection[] = [
  MAIN_SECTION,
  HEALTH_SECTION,
  ACCOUNT_SECTION,
] as const;
