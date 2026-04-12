import type { DayKey } from "@/lib/ui/calendar/types";

/**
 * Per-day rollup from GET /users/me/daily-facts — distinguishes “no numeric steps field” from a real zero.
 */
export type DayStepsRollupEntry =
  | { kind: "numeric"; steps: number }
  | { kind: "absent" }
  | { kind: "error"; message: string; requestId: string | null };

export type ActivityStepsRollupMap = Record<DayKey, DayStepsRollupEntry>;
