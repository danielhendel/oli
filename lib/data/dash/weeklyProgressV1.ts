/**
 * Weekly Progress V1 — equal-weight plan-completion across eligible
 * Activity / Strength / Cardio / Sleep contributors (min 2 of 4).
 */
export const WEEKLY_PROGRESS_CONTRIBUTOR_KEYS = [
  "activity",
  "strength",
  "cardio",
  "sleep",
] as const;

export type WeeklyProgressContributorKey = (typeof WEEKLY_PROGRESS_CONTRIBUTOR_KEYS)[number];

export const WEEKLY_PROGRESS_TOTAL_CONTRIBUTOR_COUNT = 4 as const;
export const WEEKLY_PROGRESS_MIN_ELIGIBLE_CONTRIBUTORS = 2 as const;

/** Domains visible on the card but never included in Weekly Progress V1. */
export const WEEKLY_PROGRESS_EXCLUDED_VISIBLE_KEYS = [
  "readiness",
  "nutrition",
  "stress",
  "bodyComposition",
] as const;

export type WeeklyProgressContribution = {
  key: WeeklyProgressContributorKey;
  /** Finite 0..1 progress; eligibility already validated by caller. */
  progress01: number;
};

export type WeeklyProgressV1Result = {
  score0to100: number | null;
  eligibleContributorCount: number;
  totalContributorCount: typeof WEEKLY_PROGRESS_TOTAL_CONTRIBUTOR_COUNT;
  eligibleKeys: readonly WeeklyProgressContributorKey[];
};

function isFiniteProgress01(n: unknown): n is number {
  return typeof n === "number" && Number.isFinite(n);
}

/**
 * Build Weekly Progress from already-filtered eligible contributions.
 *
 * Eligibility (caller responsibility):
 * - target exists
 * - trusted value exists (including trusted zero)
 * - progress is finite
 * - source not disconnected / error
 * - required coverage exists
 *
 * Missing / disconnected / error / no-goal contributions must be omitted.
 */
export function computeWeeklyProgressV1(
  contributions: readonly WeeklyProgressContribution[],
): WeeklyProgressV1Result {
  const eligible: WeeklyProgressContribution[] = [];
  const seen = new Set<WeeklyProgressContributorKey>();

  for (const c of contributions) {
    if (!WEEKLY_PROGRESS_CONTRIBUTOR_KEYS.includes(c.key)) continue;
    if (seen.has(c.key)) continue;
    if (!isFiniteProgress01(c.progress01)) continue;
    seen.add(c.key);
    eligible.push({
      key: c.key,
      progress01: Math.min(1, Math.max(0, c.progress01)),
    });
  }

  const eligibleContributorCount = eligible.length;
  const eligibleKeys = eligible.map((c) => c.key);

  if (eligibleContributorCount < WEEKLY_PROGRESS_MIN_ELIGIBLE_CONTRIBUTORS) {
    return {
      score0to100: null,
      eligibleContributorCount,
      totalContributorCount: WEEKLY_PROGRESS_TOTAL_CONTRIBUTOR_COUNT,
      eligibleKeys,
    };
  }

  const sum = eligible.reduce((acc, c) => acc + c.progress01, 0);
  const mean = sum / eligibleContributorCount;
  const score0to100 = Math.round(Math.min(1, Math.max(0, mean)) * 100);

  return {
    score0to100,
    eligibleContributorCount,
    totalContributorCount: WEEKLY_PROGRESS_TOTAL_CONTRIBUTOR_COUNT,
    eligibleKeys,
  };
}
