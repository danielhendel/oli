// lib/data/program/buildProgrammingPrescription.ts
/**
 * The Programming Engine orchestrator (pure, deterministic).
 *
 * Pipeline (mirrors the spec's engine architecture):
 *   1. Load base volume table by sex + level.
 *   2. Apply training-type multiplier.
 *   3–4. Expand coarse Chest/Back into canonical groups (split logic).
 *   5. Non-template groups stay 0 unless manually overridden.
 *   6. Frequency per muscle from weekly sets + training days.
 *   7. Rep range / RIR / RPE / progression from training type + level (+ role).
 *   8. Weekly-split day structure from training days.
 *   9. Per-session set ceiling enforced via frequency (see distributeProgrammingVolume).
 *  10. Manual overrides win and persist (source "manual").
 *
 * No IO, no React, no Firebase/API. Same inputs ⇒ identical output.
 */
import {
  PROGRAM_DESIGN_CATEGORY_TITLE,
  PROGRAM_DESIGN_MUSCLE_GROUP_LABEL,
  PROGRAM_DESIGN_MUSCLE_GROUP_ORDER,
} from "@/lib/data/program/workoutProgramDesignOptions";
import type { WorkoutProgramDesignDraft } from "@/lib/data/program/workoutProgramDesignTypes";
import type {
  MusclePrescription,
  ProgrammingInputs,
  ProgrammingOverrides,
  ProgrammingPrescription,
} from "@/lib/data/program/programmingEngineTypes";
import {
  expandBaseToCanonical,
  getBaseVolume,
} from "@/lib/data/program/programmingEngineBaseVolume";
import {
  applyVolumeMultiplierToBase,
  getTrainingTypeVolumeMultiplier,
} from "@/lib/data/program/programmingEngineModifiers";
import {
  getIntensityPrescription,
  getProgressionModel,
  muscleRole,
} from "@/lib/data/program/programmingIntensityRules";
import {
  buildProgrammingSplitDays,
  frequencyForMuscle,
} from "@/lib/data/program/distributeProgrammingVolume";

/** Generate the full prescription from validated inputs + optional manual overrides. */
export function buildProgrammingPrescription(
  inputs: ProgrammingInputs,
  overrides: ProgrammingOverrides = {},
): ProgrammingPrescription {
  const { muscleVolume = {}, frequency = {}, splitDayNames = {} } = overrides;

  const base = getBaseVolume(inputs.sex, inputs.trainingLevel);
  const multiplier = getTrainingTypeVolumeMultiplier(inputs.trainingType);
  const scaled = applyVolumeMultiplierToBase(base, multiplier);
  const engineCanonical = expandBaseToCanonical(scaled);
  const progressionModel = getProgressionModel(inputs.trainingType);

  const muscles: MusclePrescription[] = PROGRAM_DESIGN_MUSCLE_GROUP_ORDER.map((id) => {
    const engineSets = engineCanonical[id] ?? 0;
    const override = muscleVolume[id];
    const hasOverride = typeof override === "number";
    const weeklySets = hasOverride ? override : engineSets;
    const intensity = getIntensityPrescription(
      inputs.trainingType,
      inputs.trainingLevel,
      muscleRole(id),
    );
    const engineFrequency = frequencyForMuscle(weeklySets, inputs.trainingDays);
    const freqOverride = frequency[id];
    const frequencyPerWeek =
      weeklySets > 0 && typeof freqOverride === "number"
        ? Math.min(Math.max(Math.round(freqOverride), 1), inputs.trainingDays)
        : engineFrequency;
    return {
      muscleGroupId: id,
      label: PROGRAM_DESIGN_MUSCLE_GROUP_LABEL[id],
      weeklySets,
      frequencyPerWeek,
      repRange: intensity.repRange,
      rirTarget: intensity.rirTarget,
      rpeTarget: intensity.rpeTarget,
      progressionModel,
      source: hasOverride ? "manual" : "engine",
    };
  });

  const totalWeeklySets = muscles.reduce((total, m) => total + m.weeklySets, 0);
  const trainedFrequencies = muscles
    .filter((m) => m.weeklySets > 0)
    .map((m) => m.frequencyPerWeek);
  const frequencyRange =
    trainedFrequencies.length > 0
      ? { min: Math.min(...trainedFrequencies), max: Math.max(...trainedFrequencies) }
      : { min: 0, max: 0 };

  const days = buildProgrammingSplitDays(inputs.trainingDays, splitDayNames);
  const headline = getIntensityPrescription(inputs.trainingType, inputs.trainingLevel, "primary");

  return {
    inputs,
    muscles,
    totalWeeklySets,
    weeklySplit: { dayCount: inputs.trainingDays, days },
    progressionModel,
    headline,
    frequencyRange,
  };
}

/**
 * Whether the draft has the inputs the engine needs to generate. Age and goal are informational,
 * so generation requires sex + training level + training days + training type.
 */
export function isProgrammingInputComplete(draft: WorkoutProgramDesignDraft): boolean {
  return (
    draft.sex != null &&
    draft.trainingLevel != null &&
    draft.trainingDays != null &&
    draft.trainingType != null
  );
}

/** Titles of the still-missing required inputs, in category order (for the "what's left" hint). */
export function missingProgrammingInputTitles(draft: WorkoutProgramDesignDraft): string[] {
  const missing: string[] = [];
  if (draft.sex == null) missing.push(PROGRAM_DESIGN_CATEGORY_TITLE.sex);
  if (draft.trainingLevel == null) missing.push(PROGRAM_DESIGN_CATEGORY_TITLE.trainingLevel);
  if (draft.trainingDays == null) missing.push(PROGRAM_DESIGN_CATEGORY_TITLE.trainingDays);
  if (draft.trainingType == null) missing.push(PROGRAM_DESIGN_CATEGORY_TITLE.trainingType);
  return missing;
}

/**
 * Build a prescription directly from the client-side draft, threading manual overrides. Returns
 * null when required inputs are missing (the caller shows a "complete your selections" hint).
 */
export function buildProgrammingPrescriptionFromDraft(
  draft: WorkoutProgramDesignDraft,
): ProgrammingPrescription | null {
  const { sex, trainingLevel, trainingDays, trainingType } = draft;
  if (sex == null || trainingLevel == null || trainingDays == null || trainingType == null) {
    return null;
  }
  return buildProgrammingPrescription(
    { sex, age: draft.age, trainingLevel, trainingDays, goal: draft.goal, trainingType },
    {
      muscleVolume: draft.muscleVolumeOverrides,
      frequency: draft.frequencyOverrides,
      splitDayNames: draft.splitDayNameOverrides,
    },
  );
}
