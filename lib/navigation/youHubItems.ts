/**
 * You destination: what Oli knows about the user.
 * Launch-facing links are real existing capabilities only — no DNA / Medical History /
 * Scans / Medication / Health-record supplements placeholders.
 */

export type YouHubItem = {
  id: string;
  label: string;
  accessibilityLabel: string;
  href: string;
  testID: string;
};

export type YouHubSection = {
  id: string;
  title: string;
  items: readonly YouHubItem[];
};

const ACCOUNT_ITEMS: readonly YouHubItem[] = [
  {
    id: "profile",
    label: "Profile",
    accessibilityLabel: "Profile",
    href: "/(app)/(tabs)/profile",
    testID: "you-hub-profile",
  },
  {
    id: "settings",
    label: "Settings",
    accessibilityLabel: "Settings",
    href: "/(app)/settings",
    testID: "you-hub-settings",
  },
  {
    id: "account",
    label: "Account",
    accessibilityLabel: "Account",
    href: "/(app)/settings",
    testID: "you-hub-account",
  },
];

const SOURCE_ITEMS: readonly YouHubItem[] = [
  {
    id: "devices",
    label: "Connected devices",
    accessibilityLabel: "Connected devices",
    href: "/(app)/settings/devices",
    testID: "you-hub-devices",
  },
  {
    id: "assessments",
    label: "Assessments",
    accessibilityLabel: "Assessments",
    href: "/(app)/profile/health-assessment",
    testID: "you-hub-assessments",
  },
  {
    id: "labs",
    label: "Labs",
    accessibilityLabel: "Labs",
    href: "/(app)/labs",
    testID: "you-hub-labs",
  },
];

/** Seven domains remain reachable after primary domain tabs are removed. */
export const YOU_HEALTH_PERFORMANCE_DATA_ITEMS: readonly YouHubItem[] = [
  {
    id: "body",
    label: "Body",
    accessibilityLabel: "Body",
    href: "/(app)/body",
    testID: "you-hub-body",
  },
  {
    id: "recovery",
    label: "Recovery",
    accessibilityLabel: "Recovery",
    href: "/(app)/recovery",
    testID: "you-hub-recovery",
  },
  {
    id: "movement",
    label: "Movement",
    accessibilityLabel: "Movement",
    href: "/(app)/activity",
    testID: "you-hub-movement",
  },
  {
    id: "strength",
    label: "Strength",
    accessibilityLabel: "Strength",
    href: "/(app)/workouts",
    testID: "you-hub-strength",
  },
  {
    id: "cardio",
    label: "Cardio",
    accessibilityLabel: "Cardio",
    href: "/(app)/cardio",
    testID: "you-hub-cardio",
  },
  {
    id: "nutrition",
    label: "Nutrition",
    accessibilityLabel: "Nutrition",
    href: "/(app)/nutrition",
    testID: "you-hub-nutrition",
  },
  {
    id: "health_labs",
    label: "Health / Labs",
    accessibilityLabel: "Health and Labs",
    href: "/(app)/labs",
    testID: "you-hub-health-labs",
  },
  {
    id: "supplements",
    label: "Supplements",
    accessibilityLabel: "Supplements",
    href: "/(app)/nutrition/supplements",
    testID: "you-hub-supplements",
  },
];

const HISTORY_ITEMS: readonly YouHubItem[] = [
  {
    id: "library",
    label: "Data lineage",
    accessibilityLabel: "Data lineage and replay",
    href: "/(app)/(tabs)/library",
    testID: "you-hub-library",
  },
  {
    id: "your_data",
    label: "Your Data",
    accessibilityLabel: "Your Data",
    href: "/(app)/settings/your-data",
    testID: "you-hub-your-data",
  },
];

const SUPPORT_ITEMS: readonly YouHubItem[] = [
  {
    id: "privacy",
    label: "Privacy",
    accessibilityLabel: "Privacy",
    href: "/(app)/settings/privacy",
    testID: "you-hub-privacy",
  },
  {
    id: "failures",
    label: "Processing support",
    accessibilityLabel: "Processing support",
    href: "/(app)/failures",
    testID: "you-hub-failures",
  },
];

export const YOU_HUB_SECTIONS: readonly YouHubSection[] = [
  { id: "account", title: "Profile & account", items: ACCOUNT_ITEMS },
  { id: "sources", title: "Data sources", items: SOURCE_ITEMS },
  {
    id: "health_performance",
    title: "Health & Performance Data",
    items: YOU_HEALTH_PERFORMANCE_DATA_ITEMS,
  },
  { id: "history", title: "Historical data", items: HISTORY_ITEMS },
  { id: "support", title: "Privacy & support", items: SUPPORT_ITEMS },
] as const;

export const YOU_HUB_FORBIDDEN_LABELS = [
  "DNA",
  "Medical History",
  "Scans",
  "Medication",
  "Coming soon",
] as const;

export const YOU_HUB_ALL_ITEMS: readonly YouHubItem[] = YOU_HUB_SECTIONS.flatMap(
  (section) => section.items,
);
