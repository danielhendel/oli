import { MANAGE_HUB_ITEMS } from "@/components/navigation/manageHubItems";

/** VoiceOver hint listing Manage hub destinations (single source with menu items). */
export function manageMenuAccessibilityHint(): string {
  return `Shows ${MANAGE_HUB_ITEMS.map((item) => item.label).join(", ")}`;
}
