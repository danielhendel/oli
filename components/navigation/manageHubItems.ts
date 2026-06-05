/**
 * Routes used by the Manage launcher menu (order = display order top → bottom).
 */
export type ManageHubItem = {
  id: string;
  label: string;
  accessibilityLabel: string;
  href: string;
};

export const MANAGE_HUB_ITEMS: readonly ManageHubItem[] = [
  {
    id: "profile",
    label: "Profile",
    accessibilityLabel: "Profile",
    href: "/(app)/(tabs)/profile",
  },
  {
    id: "body",
    label: "Body Composition",
    accessibilityLabel: "Body Composition",
    href: "/(app)/body",
  },
  {
    id: "activity",
    label: "Activity",
    accessibilityLabel: "Activity",
    href: "/(app)/activity",
  },
  {
    id: "strength",
    label: "Strength",
    accessibilityLabel: "Strength",
    href: "/(app)/workouts",
  },
  {
    id: "cardio",
    label: "Cardio",
    accessibilityLabel: "Cardio",
    href: "/(app)/cardio",
  },
  {
    id: "nutrition",
    label: "Nutrition",
    accessibilityLabel: "Nutrition",
    href: "/(app)/nutrition",
  },
  {
    id: "sleep",
    label: "Sleep",
    accessibilityLabel: "Sleep",
    href: "/(app)/recovery/sleep",
  },
  {
    id: "recovery",
    label: "Recovery",
    accessibilityLabel: "Recovery",
    href: "/(app)/recovery",
  },
  {
    id: "labs",
    label: "Labs",
    accessibilityLabel: "Labs",
    href: "/(app)/labs",
  },
  {
    id: "dna",
    label: "DNA",
    accessibilityLabel: "DNA",
    href: "/(app)/dna",
  },
] as const;
