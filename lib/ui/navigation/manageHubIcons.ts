import type { ComponentProps } from "react";
import type { Ionicons } from "@expo/vector-icons";

/** Ionicons names for Manage hub modules (shared with Weekly Fitness progress-to-goal). */
export const MANAGE_HUB_ICON_BY_ID = {
  profile: "person-circle-outline",
  body: "accessibility-outline",
  activity: "footsteps-outline",
  strength: "barbell-outline",
  cardio: "heart-outline",
  nutrition: "restaurant-outline",
  sleep: "moon-outline",
  recovery: "pulse-outline",
  labs: "flask-outline",
  dna: "sparkles-outline",
} as const satisfies Record<string, ComponentProps<typeof Ionicons>["name"]>;

export type ManageHubIconId = keyof typeof MANAGE_HUB_ICON_BY_ID;

export function manageHubIconName(id: string): ComponentProps<typeof Ionicons>["name"] {
  const name = MANAGE_HUB_ICON_BY_ID[id as ManageHubIconId];
  return name ?? "ellipse-outline";
}
