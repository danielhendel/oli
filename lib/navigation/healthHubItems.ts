/**
 * Stage 1B Health menu — honest navigation directory for real capabilities.
 * Not the Stage 4 seven-domain Current State OS.
 *
 * Placeholders (DNA, Medical History, Scans, Medication, Health-record Supplements)
 * are intentionally absent from launch-facing navigation.
 */

import { CANONICAL_SUPPLEMENTS_HREF } from "@/lib/navigation/consumerHome";

export type HealthHubItem = {
  id:
    | "profile"
    | "body"
    | "activity"
    | "recovery"
    | "sleep"
    | "labs"
    | "supplements";
  label: string;
  accessibilityLabel: string;
  href: string;
  testID: string;
};

export const HEALTH_HUB_ITEMS: readonly HealthHubItem[] = [
  {
    id: "profile",
    label: "Profile",
    accessibilityLabel: "Profile",
    href: "/(app)/(tabs)/profile",
    testID: "health-hub-profile",
  },
  {
    id: "body",
    label: "Body Composition",
    accessibilityLabel: "Body Composition",
    href: "/(app)/body",
    testID: "health-hub-body",
  },
  {
    id: "activity",
    label: "Activity",
    accessibilityLabel: "Activity",
    href: "/(app)/activity",
    testID: "health-hub-activity",
  },
  {
    id: "recovery",
    label: "Recovery",
    accessibilityLabel: "Recovery",
    href: "/(app)/recovery",
    testID: "health-hub-recovery",
  },
  {
    id: "sleep",
    label: "Sleep",
    accessibilityLabel: "Sleep",
    href: "/(app)/recovery/sleep",
    testID: "health-hub-sleep",
  },
  {
    id: "labs",
    label: "Labs",
    accessibilityLabel: "Labs",
    href: "/(app)/labs",
    testID: "health-hub-labs",
  },
  {
    id: "supplements",
    label: "Supplements",
    accessibilityLabel: "Supplements",
    href: CANONICAL_SUPPLEMENTS_HREF,
    testID: "health-hub-supplements",
  },
] as const;

/**
 * Labels that must never appear in the Stage 1B Health menu.
 * Strength / Cardio / Nutrition remain discoverable via the primary dock.
 */
export const HEALTH_HUB_FORBIDDEN_LABELS = [
  "DNA",
  "Medical History",
  "Scans",
  "Medication",
  "Coming soon",
  "Command Center",
] as const;
