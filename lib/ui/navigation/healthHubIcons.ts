import type { ComponentProps } from "react";
import type { Ionicons } from "@expo/vector-icons";

/** Ionicons names for Health hub modules (Phase 2G-A). */
export const HEALTH_HUB_ICON_BY_ID = {
  profile: "person-circle-outline",
  medical_history: "clipboard-outline",
  labs: "flask-outline",
  scans: "scan-outline",
  medication: "medical-outline",
  supplements: "leaf-outline",
  dna: "sparkles-outline",
} as const satisfies Record<string, ComponentProps<typeof Ionicons>["name"]>;

export type HealthHubIconId = keyof typeof HEALTH_HUB_ICON_BY_ID;

export function healthHubIconName(id: string): ComponentProps<typeof Ionicons>["name"] {
  const name = HEALTH_HUB_ICON_BY_ID[id as HealthHubIconId];
  return name ?? "ellipse-outline";
}
