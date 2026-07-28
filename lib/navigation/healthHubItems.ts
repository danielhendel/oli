/**
 * Phase 2G-A Health menu destinations (order = display order top → bottom).
 * Health-only — no fitness modules.
 */

export type HealthHubItem = {
  id:
    | "profile"
    | "medical_history"
    | "labs"
    | "scans"
    | "medication"
    | "supplements"
    | "dna";
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
    id: "medical_history",
    label: "Medical History",
    accessibilityLabel: "Medical History",
    href: "/(app)/medical-history",
    testID: "health-hub-medical_history",
  },
  {
    id: "labs",
    label: "Labs",
    accessibilityLabel: "Labs",
    href: "/(app)/labs",
    testID: "health-hub-labs",
  },
  {
    id: "scans",
    label: "Scans",
    accessibilityLabel: "Scans",
    href: "/(app)/scans",
    testID: "health-hub-scans",
  },
  {
    id: "medication",
    label: "Medication",
    accessibilityLabel: "Medication",
    href: "/(app)/medication",
    testID: "health-hub-medication",
  },
  {
    id: "supplements",
    label: "Supplements",
    accessibilityLabel: "Supplements",
    href: "/(app)/supplements",
    testID: "health-hub-supplements",
  },
  {
    id: "dna",
    label: "DNA",
    accessibilityLabel: "DNA",
    href: "/(app)/dna",
    testID: "health-hub-dna",
  },
] as const;

/** Labels that must never appear in the Phase 2G-A Health menu. */
export const HEALTH_HUB_FORBIDDEN_LABELS = [
  "Body Composition",
  "Activity",
  "Strength",
  "Cardio",
  "Nutrition",
  "Sleep",
  "Recovery",
] as const;
