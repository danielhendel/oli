import { CLIENT_TIMELINE_SLOT_ORDER } from "./types";
import type {
  ClientMediaSource,
  ClientMediaTimeline,
  ClientMediaTimelineItem,
  MasterMediaPackage,
  MediaComposerState,
  MediaSlot,
  MediaSlotType,
} from "./types";

function resolveTimelineSource(
  slotType: MediaSlotType,
  composer: MediaComposerState,
): ClientMediaSource {
  const hasCoachMessage = composer.coachMessage.trim().length > 0;
  if ((slotType === "coachIntro" || slotType === "coachNote") && hasCoachMessage) {
    return "coach-custom";
  }
  return "oli-master";
}

function buildClientPurpose(slot: MediaSlot, composer: MediaComposerState): string {
  const base = slot.clientPurpose ?? slot.purpose;
  const style = composer.selectedTeachingStyle;
  const difficulty = composer.selectedDifficulty;

  return `${base} Delivered in ${style} style at ${difficulty} level.`;
}

function sortTimelineItems(items: ClientMediaTimelineItem[]): ClientMediaTimelineItem[] {
  const order = new Map(CLIENT_TIMELINE_SLOT_ORDER.map((slotType, index) => [slotType, index]));
  return [...items].sort((a, b) => {
    const aOrder = order.get(a.slotType) ?? 999;
    const bOrder = order.get(b.slotType) ?? 999;
    if (aOrder !== bOrder) return aOrder - bOrder;
    return a.title.localeCompare(b.title);
  });
}

/** Deterministic client media timeline from master package and composer state. */
export function buildClientMediaTimeline(
  mediaPackage: MasterMediaPackage,
  composer: MediaComposerState,
): ClientMediaTimeline {
  const enabled = new Set(composer.enabledSlots);
  const slotByType = new Map(mediaPackage.slots.map((slot) => [slot.slotType, slot]));

  const items: ClientMediaTimelineItem[] = [];

  for (const slotType of CLIENT_TIMELINE_SLOT_ORDER) {
    if (!enabled.has(slotType)) continue;
    const slot = slotByType.get(slotType);
    if (!slot) continue;

    items.push({
      itemId: `${composer.exerciseId}-${slotType}`,
      slotId: slot.slotId,
      slotType,
      title: slot.title,
      type: slotType,
      durationSeconds: slot.recommendedDurationSeconds,
      source: resolveTimelineSource(slotType, composer),
      clientPurpose: buildClientPurpose(slot, composer),
    });
  }

  const sorted = sortTimelineItems(items);
  const totalDurationSeconds = sorted.reduce((sum, item) => sum + item.durationSeconds, 0);

  return {
    exerciseId: composer.exerciseId,
    totalDurationSeconds,
    items: sorted,
  };
}
