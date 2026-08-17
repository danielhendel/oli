/**
 * Real Health / You destinations (no launch-facing placeholders).
 * Health is no longer a primary dock destination; these links live under You.
 */

export type HealthHubItem = {
  id:
    | "profile"
    | "body"
    | "movement"
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
    label: "Body",
    accessibilityLabel: "Body",
    href: "/(app)/body",
    testID: "health-hub-body",
  },
  {
    id: "movement",
    label: "Movement",
    accessibilityLabel: "Movement",
    href: "/(app)/activity",
    testID: "health-hub-movement",
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
    href: "/(app)/nutrition/supplements",
    testID: "health-hub-supplements",
  },
] as const;

/** Labels that must never appear in launch-facing Health / You discovery. */
export const HEALTH_HUB_FORBIDDEN_LABELS = [
  "DNA",
  "Medical History",
  "Scans",
  "Medication",
  "Coming soon",
] as const;
