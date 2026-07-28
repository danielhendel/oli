import { MANAGE_HUB_ITEMS } from "@/components/navigation/manageHubItems";
import { HEALTH_HUB_ITEMS } from "@/lib/navigation/healthHubItems";
import { isPrimaryNavHealthV1Enabled } from "@/lib/navigation/primaryNavHealthV1";

/** VoiceOver hint listing hub destinations (Manage or Health, based on flag). */
export function manageMenuAccessibilityHint(): string {
  const items = isPrimaryNavHealthV1Enabled() ? HEALTH_HUB_ITEMS : MANAGE_HUB_ITEMS;
  return `Shows ${items.map((item) => item.label).join(", ")}`;
}
