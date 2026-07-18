/**
 * Pure Timeline feed scroll-intent helpers.
 * Keeps cold-open / Return-to-Today / calendar-jump targeting out of render paths.
 */

import type { TimelineFeedSection } from "@/lib/features/timeline/timelineFeedOrder";
import { finalSectionIndex } from "@/lib/features/timeline/timelineFeedOrder";

export type FeedScrollMode = "newest" | "day";

export type FeedScrollTarget = {
  /** Monotonic id; each intentional reset gets a new id. */
  id: number;
  mode: FeedScrollMode;
  /** Required when mode === "day". */
  day?: string;
};

export type ScrollLocationTarget = {
  sectionIndex: number;
  itemIndex: number;
  /** 0 = align section near top (calendar jump); 1 = align near bottom (Today). */
  viewPosition: number;
};

/** Bounded retries for SectionList scrollToLocation / onScrollToIndexFailed. */
export const MAX_FEED_SCROLL_RETRIES = 8;

/** Max sequential older-page loads while ensuring a calendar day is present. */
export const MAX_ENSURE_DAY_OLDER_PAGES = 10;

export function sectionIndexForDay(
  sections: readonly TimelineFeedSection[],
  day: string,
): number {
  return sections.findIndex((s) => s.day === day);
}

export function resolveScrollLocation(
  sections: readonly TimelineFeedSection[],
  target: FeedScrollTarget,
): ScrollLocationTarget | null {
  if (sections.length === 0) return null;
  if (target.mode === "newest") {
    const sectionIndex = finalSectionIndex(sections);
    const last = sections[sectionIndex];
    return {
      sectionIndex,
      itemIndex: Math.max(0, (last?.data.length ?? 1) - 1),
      viewPosition: 1,
    };
  }
  const day = target.day;
  if (!day) return null;
  const sectionIndex = sectionIndexForDay(sections, day);
  if (sectionIndex < 0) return null;
  return {
    sectionIndex,
    itemIndex: 0,
    viewPosition: 0,
  };
}

export function dayIsLoaded(
  sections: readonly TimelineFeedSection[],
  day: string,
): boolean {
  return sectionIndexForDay(sections, day) >= 0;
}

export type EnsureDayBudget = {
  pagesRequested: number;
  maxPages: number;
  hasMore: boolean;
  targetLoaded: boolean;
};

/** Whether another older page may be requested while seeking a calendar day. */
export function canRequestEnsureDayPage(budget: EnsureDayBudget): boolean {
  if (budget.targetLoaded) return false;
  if (!budget.hasMore) return false;
  return budget.pagesRequested < budget.maxPages;
}

export function nextEnsureDayPageCount(pagesRequested: number): number {
  return pagesRequested + 1;
}
