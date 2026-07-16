/**
 * Pure Body Composition Goal editor helpers (validation + canonical payload build).
 */
import {
  BODY_COMPOSITION_GOAL_VERSION,
  bodyCompositionGoalV1Schema,
  canonicalUnitForBodyCompositionMetric,
  type BodyCompositionGoalV1,
  type BodyCompositionPrimaryMetric,
} from "@oli/contracts";
import { LB_PER_KG } from "@/lib/body/bodyCompositionShared";

export type BodyCompositionGoalEditorFieldError =
  | "no_measurement"
  | "invalid_target"
  | "non_finite"
  | "target_equals_baseline"
  | "unit_mismatch";

export type BodyCompositionGoalLatestMeasurement = {
  metric: BodyCompositionPrimaryMetric;
  /** Canonical: kg for weight/leanMass, percent for bodyFat. */
  valueCanonical: number;
  measuredAtIso: string;
};

export type BodyCompositionGoalDraftInput = {
  primaryMetric: BodyCompositionPrimaryMetric;
  /** Target as typed by the user in display units. */
  targetDisplayText: string;
  massDisplayUnit: "kg" | "lb";
  latest: BodyCompositionGoalLatestMeasurement | null;
  existingGoal: BodyCompositionGoalV1 | null;
  nowIso: string;
};

export type BodyCompositionGoalDraftResult =
  | {
      ok: true;
      goal: BodyCompositionGoalV1;
      /** True when saving would reset baseline to the latest measurement. */
      baselineReset: boolean;
      requiresConfirm: boolean;
      confirmReason: "primary_metric_change" | "material_target_change" | null;
    }
  | { ok: false; error: BodyCompositionGoalEditorFieldError; message: string };

const MATERIAL_TARGET_EPSILON = 1e-6;

export function parseDisplayTargetToCanonical(input: {
  primaryMetric: BodyCompositionPrimaryMetric;
  targetDisplayText: string;
  massDisplayUnit: "kg" | "lb";
}): { ok: true; value: number } | { ok: false; error: BodyCompositionGoalEditorFieldError; message: string } {
  const trimmed = input.targetDisplayText.trim().replace(/,/g, "");
  if (trimmed.length === 0) {
    return { ok: false, error: "invalid_target", message: "Enter a target value." };
  }
  const n = Number(trimmed);
  if (!Number.isFinite(n)) {
    return { ok: false, error: "non_finite", message: "Enter a valid number for the target." };
  }

  if (input.primaryMetric === "bodyFat") {
    if (n < 0 || n > 100) {
      return { ok: false, error: "invalid_target", message: "Body fat target must be between 0 and 100%." };
    }
    return { ok: true, value: n };
  }

  const kg = input.massDisplayUnit === "lb" ? n / LB_PER_KG : n;
  if (!Number.isFinite(kg) || kg <= 0) {
    return { ok: false, error: "invalid_target", message: "Enter a positive mass target." };
  }
  return { ok: true, value: kg };
}

export function formatCanonicalForDisplay(input: {
  primaryMetric: BodyCompositionPrimaryMetric;
  valueCanonical: number;
  massDisplayUnit: "kg" | "lb";
}): string {
  if (input.primaryMetric === "bodyFat") {
    return `${input.valueCanonical.toFixed(1)}%`;
  }
  if (input.massDisplayUnit === "lb") {
    return `${(input.valueCanonical * LB_PER_KG).toFixed(1)} lb`;
  }
  return `${input.valueCanonical.toFixed(1)} kg`;
}

export function isMaterialTargetChange(
  existing: BodyCompositionGoalV1,
  nextTargetCanonical: number,
): boolean {
  return Math.abs(existing.targetValue - nextTargetCanonical) > MATERIAL_TARGET_EPSILON;
}

/**
 * Build a canonical BodyCompositionGoalV1 from editor draft.
 * Does not persist — caller confirms baseline resets then PUTs preferences.
 */
export function buildBodyCompositionGoalDraft(
  input: BodyCompositionGoalDraftInput,
  options?: { confirmBaselineReset?: boolean },
): BodyCompositionGoalDraftResult {
  if (input.latest == null || input.latest.metric !== input.primaryMetric) {
    return {
      ok: false,
      error: "no_measurement",
      message: "Add a trusted body measurement for this metric before setting a goal.",
    };
  }
  if (!Number.isFinite(input.latest.valueCanonical)) {
    return {
      ok: false,
      error: "no_measurement",
      message: "Add a trusted body measurement for this metric before setting a goal.",
    };
  }

  const parsed = parseDisplayTargetToCanonical({
    primaryMetric: input.primaryMetric,
    targetDisplayText: input.targetDisplayText,
    massDisplayUnit: input.massDisplayUnit,
  });
  if (!parsed.ok) return parsed;

  const baseline = input.latest.valueCanonical;
  if (baseline === parsed.value) {
    return {
      ok: false,
      error: "target_equals_baseline",
      message: "Target must differ from your current measurement.",
    };
  }

  const unit = canonicalUnitForBodyCompositionMetric(input.primaryMetric);
  const existing = input.existingGoal;
  const primaryChanged =
    existing != null && existing.primaryMetric !== input.primaryMetric;
  const targetChanged =
    existing != null &&
    !primaryChanged &&
    isMaterialTargetChange(existing, parsed.value);
  const isCreate = existing == null;
  const requiresConfirm = !isCreate && (primaryChanged || targetChanged);

  if (requiresConfirm && options?.confirmBaselineReset !== true) {
    // Preview the would-be goal so callers can confirm before PUT.
    const preview: BodyCompositionGoalV1 = {
      version: BODY_COMPOSITION_GOAL_VERSION,
      primaryMetric: input.primaryMetric,
      baselineValue: baseline,
      targetValue: parsed.value,
      unit,
      baselineAt: input.latest.measuredAtIso,
      createdAt: existing.createdAt,
      updatedAt: input.nowIso,
    };
    return {
      ok: true,
      goal: preview,
      baselineReset: true,
      requiresConfirm: true,
      confirmReason: primaryChanged ? "primary_metric_change" : "material_target_change",
    };
  }

  const now = input.nowIso;
  const goal: BodyCompositionGoalV1 = {
    version: BODY_COMPOSITION_GOAL_VERSION,
    primaryMetric: input.primaryMetric,
    baselineValue: baseline,
    targetValue: parsed.value,
    unit,
    baselineAt: input.latest.measuredAtIso,
    createdAt: existing?.createdAt ?? now,
    updatedAt: now,
  };

  const checked = bodyCompositionGoalV1Schema.safeParse(goal);
  if (!checked.success) {
    return {
      ok: false,
      error: "invalid_target",
      message: "Could not save this goal. Check the target and try again.",
    };
  }

  return {
    ok: true,
    goal: checked.data,
    baselineReset: isCreate || requiresConfirm || options?.confirmBaselineReset === true,
    requiresConfirm: false,
    confirmReason: null,
  };
}

export const BODY_COMPOSITION_GOAL_EXPLAINER =
  "Your score shows progress from your current baseline toward this target.";

export const BODY_COMPOSITION_METRIC_LABELS: Record<BodyCompositionPrimaryMetric, string> = {
  weight: "Weight",
  bodyFat: "Body Fat",
  leanMass: "Lean Mass",
};
