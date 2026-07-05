import type { Readiness } from "@/lib/contracts/readiness";

export type TodayReadinessStatusInput = {
  readinessScore: number | null | undefined;
  sleepScore: number | null | undefined;
  /** When the readiness view fetch failed. */
  fetchStatus?: Readiness | null;
};

/** Maps Today Command score facts to contract-owned readiness vocabulary. */
export function normalizeTodayReadinessStatus(input: TodayReadinessStatusInput): Readiness {
  if (input.fetchStatus === "error") return "error";

  const readiness =
    typeof input.readinessScore === "number" && Number.isFinite(input.readinessScore)
      ? input.readinessScore
      : null;
  const sleep =
    typeof input.sleepScore === "number" && Number.isFinite(input.sleepScore) ? input.sleepScore : null;

  if (readiness != null) return "ready";
  if (sleep != null) return "partial";
  return "missing";
}

/** User-facing activity guidance derived from an Oura score — not contract readiness state. */
export function readinessActivityPhraseFromScore(score: number): string {
  if (score >= 80) return "You're ready for an active day.";
  if (score >= 65) return "You're ready for a moderate day.";
  return "Take it a bit easier today.";
}
