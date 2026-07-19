// Pure predicate: day-level Activity/Steps aggregates are context-only, never chronological actions.

import type { TimelineSourceType } from "@/lib/features/timeline/types";

type AggregateCandidate = {
  sourceType?: TimelineSourceType;
  kind?: string;
};

/**
 * True when an event/item is a day-level Activity or Steps aggregate that belongs
 * only in Daily Timeline context — not as a chronological rail action.
 */
export function isDailyTimelineAggregateAction(item: AggregateCandidate): boolean {
  if (item.kind === "steps" || item.kind === "activity_final") return true;
  if (item.sourceType === "steps" || item.sourceType === "activity") return true;
  return false;
}
