import { createId } from "./ids";
import { createDefaultDesignedSets } from "./designedSetUtils";
import { resizeDesignedSetCount, parseRirTargetInput, parseRpeTargetInput } from "./updateExercisePrescriptionFromRow";
import type {
  ExerciseBuilderPrescription,
  ExerciseLoadMode,
  ExerciseLoadUnit,
  ExerciseRepsMode,
  ExerciseSideMode,
  IntensityTargetKind,
  PerSetBuilderFields,
  RestDisplayUnit,
  WorkoutDesignedSet,
  WorkoutExerciseCard,
} from "./types";

export function defaultExerciseBuilderPrescription(): ExerciseBuilderPrescription {
  return {
    repsMode: "reps",
    sideMode: "total",
    loadMode: "totalWeight",
    loadUnit: "lbs",
    loadValue: "",
    customizeEachSet: true,
    exerciseNotes: "",
    perSetFields: {},
  };
}

export function resolveExerciseBuilderPrescription(
  exercise: Pick<WorkoutExerciseCard, "builderPrescription">,
): ExerciseBuilderPrescription {
  const defaults = defaultExerciseBuilderPrescription();
  if (!exercise.builderPrescription) return defaults;
  return {
    ...defaults,
    ...exercise.builderPrescription,
    perSetFields: exercise.builderPrescription.perSetFields ?? {},
  };
}

export function formatLoadGuidance(
  loadMode: ExerciseLoadMode,
  loadValue: string,
  loadUnit: ExerciseLoadUnit,
): string {
  const trimmed = loadValue.trim();
  if (!trimmed) return "";

  if (loadMode === "repMaxPercent") {
    return `${trimmed}% RM`;
  }
  if (loadUnit === "kg") {
    return `${trimmed} kg`;
  }
  if (loadUnit === "percent") {
    return `${trimmed}%`;
  }
  return `${trimmed} lbs`;
}

export function parseLoadGuidance(loadGuidance: string): Pick<
  ExerciseBuilderPrescription,
  "loadMode" | "loadUnit" | "loadValue"
> {
  const trimmed = loadGuidance.trim();
  if (!trimmed) {
    return { loadMode: "totalWeight", loadUnit: "lbs", loadValue: "" };
  }

  const rmMatch = /^([\d.]+)\s*%?\s*RM$/i.exec(trimmed);
  if (rmMatch?.[1]) {
    return { loadMode: "repMaxPercent", loadUnit: "percent", loadValue: rmMatch[1] };
  }

  const kgMatch = /^([\d.]+)\s*kg$/i.exec(trimmed);
  if (kgMatch?.[1]) {
    return { loadMode: "totalWeight", loadUnit: "kg", loadValue: kgMatch[1] };
  }

  const lbsMatch = /^([\d.]+)\s*lbs?$/i.exec(trimmed);
  if (lbsMatch?.[1]) {
    return { loadMode: "totalWeight", loadUnit: "lbs", loadValue: lbsMatch[1] };
  }

  const percentMatch = /^([\d.]+)\s*%$/.exec(trimmed);
  if (percentMatch?.[1]) {
    return { loadMode: "repMaxPercent", loadUnit: "percent", loadValue: percentMatch[1] };
  }

  return { loadMode: "totalWeight", loadUnit: "lbs", loadValue: trimmed };
}

export function formatRepValueForMode(repsMode: ExerciseRepsMode, repRange: string): string {
  if (repsMode === "time") {
    return repRange.replace(/s$/i, "").trim();
  }
  if (repsMode === "distance") {
    return repRange.replace(/m$/i, "").trim();
  }
  return repRange;
}

export function formatRepRangeForMode(repsMode: ExerciseRepsMode, value: string): string {
  const trimmed = value.trim();
  if (!trimmed) return repsMode === "reps" ? "8-12" : "";

  if (repsMode === "time") {
    return trimmed.endsWith("s") ? trimmed : `${trimmed}s`;
  }
  if (repsMode === "distance") {
    return trimmed.endsWith("m") ? trimmed : `${trimmed}m`;
  }
  return trimmed;
}

export function inferRepsModeFromRepRange(repRange: string): ExerciseRepsMode {
  if (/^\d+\s*s$/i.test(repRange.trim()) || repRange.includes(":")) {
    return "time";
  }
  if (/^\d+\s*m$/i.test(repRange.trim())) {
    return "distance";
  }
  return "reps";
}

export function setsAreUniform(sets: WorkoutDesignedSet[]): boolean {
  if (sets.length <= 1) return true;
  const [first, ...rest] = sets;
  if (!first) return true;

  return rest.every(
    (set) =>
      set.repRange === first.repRange &&
      set.loadGuidance === first.loadGuidance &&
      set.rpeTarget === first.rpeTarget &&
      set.restSeconds === first.restSeconds &&
      set.tempo === first.tempo,
  );
}

export function syncGeneralPrescriptionToSets(
  exercise: WorkoutExerciseCard,
  builder: ExerciseBuilderPrescription,
): WorkoutDesignedSet[] {
  const first = exercise.designedSets[0];
  const repRange = formatRepRangeForMode(
    builder.repsMode,
    formatRepValueForMode(builder.repsMode, first?.repRange ?? "8-12"),
  );
  const loadGuidance = formatLoadGuidance(builder.loadMode, builder.loadValue, builder.loadUnit);
  const rpeTarget = first?.rpeTarget ?? 8;
  const restSeconds = first?.restSeconds ?? 90;
  const tempo = first?.tempo ?? "";

  return exercise.designedSets.map((set) => ({
    ...set,
    repRange,
    loadGuidance,
    rpeTarget,
    restSeconds,
    tempo,
  }));
}

export function syncExerciseGeneralPrescription(
  exercise: WorkoutExerciseCard,
  builder: ExerciseBuilderPrescription,
): WorkoutExerciseCard {
  const designedSets = syncGeneralPrescriptionToSets(exercise, builder);
  return {
    ...exercise,
    builderPrescription: builder,
    designedSets,
    prescription: {
      ...exercise.prescription,
      repRange: designedSets[0]?.repRange ?? exercise.prescription.repRange,
      loadGuidance: designedSets[0]?.loadGuidance ?? exercise.prescription.loadGuidance,
      rpeTarget: designedSets[0]?.rpeTarget ?? exercise.prescription.rpeTarget,
      restSeconds: designedSets[0]?.restSeconds ?? exercise.prescription.restSeconds,
      tempo: designedSets[0]?.tempo ?? exercise.prescription.tempo,
      sets: designedSets.length,
    },
  };
}

export function resizeDesignedSetsPreservingValues(
  sets: WorkoutDesignedSet[],
  targetCount: number,
  defaults?: Partial<WorkoutDesignedSet>,
): WorkoutDesignedSet[] {
  const clamped = Math.max(1, Math.min(20, Math.round(targetCount)));
  if (sets.length === clamped) return sets;

  if (sets.length > clamped) {
    return sets.slice(0, clamped).map((set, index) => ({ ...set, setNumber: index + 1 }));
  }

  const last = sets[sets.length - 1];
  const template: WorkoutDesignedSet = last ?? {
    ...createDefaultDesignedSets(1)[0]!,
    ...defaults,
  };

  const next = [...sets];
  while (next.length < clamped) {
    const source = next[next.length - 1] ?? template;
    next.push({
      ...source,
      setId: createId("set"),
      setNumber: next.length + 1,
      notes: "",
    });
  }
  return next.map((set, index) => ({ ...set, setNumber: index + 1 }));
}

export function applyBuilderPatch(
  exercise: WorkoutExerciseCard,
  patch: Partial<ExerciseBuilderPrescription>,
): WorkoutExerciseCard {
  const current = resolveExerciseBuilderPrescription(exercise);
  const nextBuilder: ExerciseBuilderPrescription = { ...current, ...patch };

  if (nextBuilder.customizeEachSet) {
    return { ...exercise, builderPrescription: nextBuilder };
  }

  const syncedSets = syncGeneralPrescriptionToSets(exercise, nextBuilder);
  return {
    ...exercise,
    builderPrescription: nextBuilder,
    designedSets: syncedSets,
    prescription: {
      ...exercise.prescription,
      repRange: syncedSets[0]?.repRange ?? exercise.prescription.repRange,
      loadGuidance: syncedSets[0]?.loadGuidance ?? exercise.prescription.loadGuidance,
      rpeTarget: syncedSets[0]?.rpeTarget ?? exercise.prescription.rpeTarget,
      restSeconds: syncedSets[0]?.restSeconds ?? exercise.prescription.restSeconds,
      tempo: syncedSets[0]?.tempo ?? exercise.prescription.tempo,
      sets: syncedSets.length,
    },
  };
}

export function applyPerSetPatch(
  exercise: WorkoutExerciseCard,
  setId: string,
  patch: Partial<WorkoutDesignedSet>,
): WorkoutExerciseCard {
  const designedSets = exercise.designedSets.map((set) =>
    set.setId === setId ? { ...set, ...patch } : set,
  );
  return { ...exercise, designedSets };
}

export function resolveRestDisplayUnit(restSeconds: number | null): RestDisplayUnit {
  if (restSeconds != null && restSeconds >= 60 && restSeconds % 60 === 0) {
    return "min";
  }
  return "sec";
}

export function formatRestForDisplay(
  restSeconds: number | null,
  unit: RestDisplayUnit,
): string {
  if (restSeconds == null) return "";
  if (unit === "min") {
    if (restSeconds % 60 === 0) return String(restSeconds / 60);
    return String(Math.round((restSeconds / 60) * 10) / 10);
  }
  return String(restSeconds);
}

export function parseRestWithUnit(raw: string, unit: RestDisplayUnit): number | null {
  const trimmed = raw.trim();
  if (!trimmed) return null;
  const parsed = Number(trimmed);
  if (!Number.isFinite(parsed)) return null;
  if (unit === "min") {
    return Math.max(0, Math.round(parsed * 60));
  }
  return Math.max(0, Math.round(parsed));
}

export function defaultPerSetBuilderFields(
  set: WorkoutDesignedSet,
  builder: ExerciseBuilderPrescription,
): PerSetBuilderFields {
  const load = parseLoadGuidance(set.loadGuidance);
  return {
    repsMode: inferRepsModeFromRepRange(set.repRange),
    sideMode: builder.sideMode,
    loadMode: load.loadMode,
    loadUnit: load.loadUnit,
    loadValue: load.loadValue,
    restUnit: resolveRestDisplayUnit(set.restSeconds),
    intensityKind: resolveIntensityTargetKind(set),
  };
}

export function resolveIntensityTargetKind(set: WorkoutDesignedSet): IntensityTargetKind {
  if (set.rirTarget != null && set.rpeTarget == null) {
    return "rir";
  }
  return "rpe";
}

export function resolveIntensityTargetValue(
  set: WorkoutDesignedSet,
  kind: IntensityTargetKind,
): string {
  const value = kind === "rir" ? set.rirTarget : set.rpeTarget;
  return value != null ? String(value) : "";
}

export function parseIntensityTargetInput(
  kind: IntensityTargetKind,
  raw: string,
): number | null {
  return kind === "rir" ? parseRirTargetInput(raw) : parseRpeTargetInput(raw);
}

export function resolvePerSetBuilderFields(
  set: WorkoutDesignedSet,
  builder: ExerciseBuilderPrescription,
): PerSetBuilderFields {
  return builder.perSetFields[set.setId] ?? defaultPerSetBuilderFields(set, builder);
}

export function applyPerSetBuilderPatch(
  exercise: WorkoutExerciseCard,
  setId: string,
  patch: Partial<PerSetBuilderFields> & {
    rpeTarget?: number | null;
    rirTarget?: number | null;
    restSeconds?: number | null;
    tempo?: string;
    notes?: string;
    repValue?: string;
    intensityValue?: string;
  },
): WorkoutExerciseCard {
  const builder = resolveExerciseBuilderPrescription(exercise);
  const set = exercise.designedSets.find((item) => item.setId === setId);
  if (!set) return exercise;

  const current = resolvePerSetBuilderFields(set, builder);
  const nextFields: PerSetBuilderFields = {
    repsMode: patch.repsMode ?? current.repsMode,
    sideMode: patch.sideMode ?? current.sideMode,
    loadMode: patch.loadMode ?? current.loadMode,
    loadUnit: patch.loadUnit ?? current.loadUnit,
    loadValue: patch.loadValue ?? current.loadValue,
    restUnit: patch.restUnit ?? current.restUnit,
    intensityKind: patch.intensityKind ?? current.intensityKind,
  };

  const repValue =
    patch.repValue ??
    formatRepValueForMode(nextFields.repsMode, set.repRange);
  const repRange = formatRepRangeForMode(nextFields.repsMode, repValue);
  const loadGuidance = formatLoadGuidance(
    nextFields.loadMode,
    nextFields.loadValue,
    nextFields.loadUnit,
  );

  const designedPatch: Partial<WorkoutDesignedSet> = {
    repRange,
    loadGuidance,
  };

  if (patch.intensityKind !== undefined && patch.intensityKind !== current.intensityKind) {
    const carriedValue = parseIntensityTargetInput(
      current.intensityKind,
      resolveIntensityTargetValue(set, current.intensityKind),
    );
    if (patch.intensityKind === "rpe") {
      designedPatch.rpeTarget = carriedValue;
      designedPatch.rirTarget = null;
    } else {
      designedPatch.rirTarget = carriedValue;
      designedPatch.rpeTarget = null;
    }
  }

  if (patch.intensityValue !== undefined) {
    const parsed = parseIntensityTargetInput(nextFields.intensityKind, patch.intensityValue);
    if (nextFields.intensityKind === "rpe") {
      designedPatch.rpeTarget = parsed;
      designedPatch.rirTarget = null;
    } else {
      designedPatch.rirTarget = parsed;
      designedPatch.rpeTarget = null;
    }
  }

  if (patch.rpeTarget !== undefined) {
    designedPatch.rpeTarget = patch.rpeTarget;
    if (patch.rpeTarget != null) {
      designedPatch.rirTarget = null;
      nextFields.intensityKind = "rpe";
    }
  }
  if (patch.rirTarget !== undefined) {
    designedPatch.rirTarget = patch.rirTarget;
    if (patch.rirTarget != null) {
      designedPatch.rpeTarget = null;
      nextFields.intensityKind = "rir";
    }
  }
  if (patch.restSeconds !== undefined) designedPatch.restSeconds = patch.restSeconds;
  if (patch.tempo !== undefined) designedPatch.tempo = patch.tempo;
  if (patch.notes !== undefined) designedPatch.notes = patch.notes;

  return {
    ...exercise,
    builderPrescription: {
      ...builder,
      perSetFields: { ...builder.perSetFields, [setId]: nextFields },
    },
    designedSets: exercise.designedSets.map((item) =>
      item.setId === setId ? { ...item, ...designedPatch } : item,
    ),
  };
}

export function extendPerSetFieldsForSets(
  exercise: WorkoutExerciseCard,
  previousSetIds: readonly string[],
  nextSets: readonly WorkoutDesignedSet[],
): Record<string, PerSetBuilderFields> {
  const builder = resolveExerciseBuilderPrescription(exercise);
  const nextFields = { ...builder.perSetFields };

  for (const set of nextSets) {
    if (nextFields[set.setId]) continue;
    const previousId = previousSetIds[previousSetIds.length - 1];
    const templateSet = previousId
      ? exercise.designedSets.find((item) => item.setId === previousId)
      : nextSets[0];
    const templateFields = templateSet
      ? resolvePerSetBuilderFields(templateSet, builder)
      : defaultPerSetBuilderFields(set, builder);
    nextFields[set.setId] = { ...templateFields };
  }

  for (const setId of Object.keys(nextFields)) {
    if (!nextSets.some((set) => set.setId === setId)) {
      delete nextFields[setId];
    }
  }

  return nextFields;
}

export function applyExerciseLevelRepsToAllSets(
  exercise: WorkoutExerciseCard,
  repsMode: ExerciseRepsMode,
  repValue: string,
): WorkoutExerciseCard {
  const builder = resolveExerciseBuilderPrescription(exercise);
  const repRange = formatRepRangeForMode(repsMode, repValue);
  const nextPerSetFields = { ...builder.perSetFields };

  const designedSets = exercise.designedSets.map((set) => {
    const fields = resolvePerSetBuilderFields(set, builder);
    nextPerSetFields[set.setId] = { ...fields, repsMode };
    return { ...set, repRange };
  });

  return {
    ...exercise,
    builderPrescription: { ...builder, repsMode, perSetFields: nextPerSetFields },
    designedSets,
    prescription: { ...exercise.prescription, repRange },
  };
}

export function applyExerciseLevelRestToAllSets(
  exercise: WorkoutExerciseCard,
  restSeconds: number | null,
  restUnit: RestDisplayUnit,
): WorkoutExerciseCard {
  const builder = resolveExerciseBuilderPrescription(exercise);
  const nextPerSetFields = { ...builder.perSetFields };

  const designedSets = exercise.designedSets.map((set) => {
    const fields = resolvePerSetBuilderFields(set, builder);
    nextPerSetFields[set.setId] = { ...fields, restUnit };
    return { ...set, restSeconds };
  });

  return {
    ...exercise,
    builderPrescription: { ...builder, perSetFields: nextPerSetFields },
    designedSets,
    prescription: { ...exercise.prescription, restSeconds },
  };
}

export function applyExerciseLevelSetCount(
  exercise: WorkoutExerciseCard,
  count: number,
): WorkoutExerciseCard {
  const builder = resolveExerciseBuilderPrescription(exercise);
  const previousIds = exercise.designedSets.map((set) => set.setId);
  const resized = resizeDesignedSetCount(exercise.designedSets, count);
  const perSetFields = extendPerSetFieldsForSets(exercise, previousIds, resized);

  if (builder.customizeEachSet) {
    return {
      ...exercise,
      designedSets: resized,
      builderPrescription: { ...builder, perSetFields },
      prescription: { ...exercise.prescription, sets: resized.length },
    };
  }

  return syncExerciseGeneralPrescription(
    { ...exercise, designedSets: resized, builderPrescription: { ...builder, perSetFields } },
    builder,
  );
}

export function sideModeLabel(side: ExerciseSideMode): string {
  switch (side) {
    case "total":
      return "Total";
    case "each":
      return "Each";
    case "left":
      return "Left";
    case "right":
      return "Right";
  }
}
