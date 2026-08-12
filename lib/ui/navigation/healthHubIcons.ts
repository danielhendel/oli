import type { ComponentProps } from "react";
import type { Ionicons } from "@expo/vector-icons";

/** Ionicons names for Health hub modules (Stage 1B). */
export const HEALTH_HUB_ICON_BY_ID = {
  profile: "person-circle-outline",
  body: "body-outline",
  activity: "walk-outline",
  recovery: "fitness-outline",
  sleep: "moon-outline",
  labs: "flask-outline",
  supplements: "leaf-outline",
} as const satisfies Record<string, ComponentProps<typeof Ionicons>["name"]>;

export type HealthHubIconId = keyof typeof HEALTH_HUB_ICON_BY_ID;

export function healthHubIconName(id: string): ComponentProps<typeof Ionicons>["name"] {
  const name = HEALTH_HUB_ICON_BY_ID[id as HealthHubIconId];
  return name ?? "ellipse-outline";
}
