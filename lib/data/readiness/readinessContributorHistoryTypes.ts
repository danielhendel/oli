/**
 * Shared types for readiness contributor-history store (Phase 2F-C1).
 *
 * One bounded 90-day range response serves all four approved contributors:
 * hrv_balance, body_temperature, recovery_index, sleep_balance.
 *
 * No consumer UI / classification in this foundation layer.
 */

import type { OuraReadinessRangeDayDto } from "@oli/contracts/ouraVendor";

import type { DayKey } from "@/lib/ui/calendar/types";

export type ReadinessContributorHistoryStatus = "idle" | "loading" | "ready" | "error";

/** Exact-day readiness range row keyed for selectors (sparse map). */
export type ReadinessContributorDayCell = {
  /** Settled after range fetch; missing day ⇒ no provider row for that day. */
  settled: boolean;
  day?: OuraReadinessRangeDayDto;
};

export type ReadinessContributorHistorySnapshot = {
  historyStatus: ReadinessContributorHistoryStatus;
  dayByDay: Partial<Record<DayKey, ReadinessContributorDayCell>>;
  errorMessage: string | null;
  rangeStart: DayKey;
  rangeEnd: DayKey;
  /** Monotonic generation for stale-response protection. */
  generation: number;
};
