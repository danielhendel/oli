import type { WorkoutDaySummaryItemDto, WorkoutMonthSummaryItemDto } from "@oli/contracts";

export type WorkoutSummaryVerificationSeverity = "regression" | "improvement" | "info";

export type WorkoutSummaryVerificationFinding = {
  code: string;
  severity: WorkoutSummaryVerificationSeverity;
  message: string;
};

function n(x: unknown): number | null {
  return typeof x === "number" && Number.isFinite(x) ? x : null;
}

/**
 * Compares day summary rows for safe backfill verification. Ignores `computedAt`.
 * Flags reductions in tab session counts or strength volume as regressions when both sides have taxonomy.
 */
export function verifyWorkoutDaySummaryRebuild(args: {
  before: WorkoutDaySummaryItemDto | null | undefined;
  after: WorkoutDaySummaryItemDto | null | undefined;
}): { ok: boolean; findings: WorkoutSummaryVerificationFinding[] } {
  const findings: WorkoutSummaryVerificationFinding[] = [];
  const { before, after } = args;

  if (before == null && after == null) {
    findings.push({
      code: "both_missing",
      severity: "info",
      message: "Neither before nor after snapshot exists",
    });
    return { ok: true, findings };
  }

  if (before == null && after != null) {
    findings.push({
      code: "created",
      severity: "info",
      message: "Summary row created (no prior snapshot)",
    });
    return { ok: true, findings };
  }

  if (before != null && after == null) {
    findings.push({
      code: "removed",
      severity: "regression",
      message: "After snapshot missing while before exists",
    });
    return { ok: false, findings };
  }

  const b = before!;
  const a = after!;

  const countFields = [
    ["rawWorkoutCount", b.rawWorkoutCount, a.rawWorkoutCount],
    ["strengthSessionCount", b.strengthSessionCount, a.strengthSessionCount],
    ["cardioSessionCount", b.cardioSessionCount, a.cardioSessionCount],
  ] as const;

  for (const [label, bv, av] of countFields) {
    if (bv > av) {
      findings.push({
        code: `count_drop_${label}`,
        severity: "regression",
        message: `${label} decreased: ${bv} → ${av}`,
      });
    }
  }

  const tb = b.strengthTaxonomy?.strengthTrainingVolumeKg;
  const ta = a.strengthTaxonomy?.strengthTrainingVolumeKg;
  if (tb != null && ta != null && ta + 1e-6 < tb) {
    findings.push({
      code: "strength_taxonomy_volume_drop",
      severity: "regression",
      message: `strengthTrainingVolumeKg decreased: ${tb} → ${ta}`,
    });
  }

  if (b.strengthTaxonomy == null && a.strengthTaxonomy != null) {
    findings.push({
      code: "taxonomy_gained",
      severity: "improvement",
      message: "strengthTaxonomy aggregates present after rebuild",
    });
  }

  if (b.strengthTaxonomy != null && a.strengthTaxonomy == null) {
    findings.push({
      code: "taxonomy_lost",
      severity: "regression",
      message: "strengthTaxonomy missing after rebuild",
    });
  }

  const regressions = findings.filter((f) => f.severity === "regression");
  return { ok: regressions.length === 0, findings };
}

/** Compare month summary rows (ignores computedAt). */
export function verifyWorkoutMonthSummaryRebuild(args: {
  before: WorkoutMonthSummaryItemDto | null | undefined;
  after: WorkoutMonthSummaryItemDto | null | undefined;
}): { ok: boolean; findings: WorkoutSummaryVerificationFinding[] } {
  const findings: WorkoutSummaryVerificationFinding[] = [];
  const { before, after } = args;

  if (before == null && after == null) {
    findings.push({ code: "both_missing", severity: "info", message: "Neither before nor after snapshot exists" });
    return { ok: true, findings };
  }
  if (before == null && after != null) {
    findings.push({ code: "created", severity: "info", message: "Month summary row created" });
    return { ok: true, findings };
  }
  if (before != null && after == null) {
    findings.push({ code: "removed", severity: "regression", message: "After snapshot missing" });
    return { ok: false, findings };
  }

  const b = before!;
  const a = after!;

  const pairs: [string, number, number][] = [
    ["strengthSessionCount", b.strengthSessionCount, a.strengthSessionCount],
    ["cardioSessionCount", b.cardioSessionCount, a.cardioSessionCount],
    ["strengthDurationSumCapped", b.strengthDurationSumCapped, a.strengthDurationSumCapped],
    ["cardioDurationSumCapped", b.cardioDurationSumCapped, a.cardioDurationSumCapped],
    ["strengthDurationCountCapped", b.strengthDurationCountCapped, a.strengthDurationCountCapped],
    ["cardioDurationCountCapped", b.cardioDurationCountCapped, a.cardioDurationCountCapped],
  ];

  for (const [label, bv, av] of pairs) {
    if (bv > av) {
      findings.push({
        code: `metric_drop_${label}`,
        severity: "regression",
        message: `${label} decreased: ${bv} → ${av}`,
      });
    }
  }

  const tb = n(b.strengthTaxonomy?.strengthTrainingVolumeKg);
  const ta = n(a.strengthTaxonomy?.strengthTrainingVolumeKg);
  if (tb != null && ta != null && ta + 1e-6 < tb) {
    findings.push({
      code: "month_strength_taxonomy_volume_drop",
      severity: "regression",
      message: `Month strengthTrainingVolumeKg decreased: ${tb} → ${ta}`,
    });
  }

  if (b.strengthTaxonomy == null && a.strengthTaxonomy != null) {
    findings.push({
      code: "taxonomy_gained",
      severity: "improvement",
      message: "Month strengthTaxonomy aggregates present after rebuild",
    });
  }
  if (b.strengthTaxonomy != null && a.strengthTaxonomy == null) {
    findings.push({
      code: "taxonomy_lost",
      severity: "regression",
      message: "Month strengthTaxonomy missing after rebuild",
    });
  }

  const regressions = findings.filter((f) => f.severity === "regression");
  return { ok: regressions.length === 0, findings };
}
