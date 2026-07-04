import type { WorkoutDesignedSet } from "./types";

export type ExercisePrescriptionRowSummary = {
  readonly setCount: number;
  readonly repRangeValue: string;
  readonly repRangeIsMixed: boolean;
  readonly rpeValue: string;
  readonly rpeIsMixed: boolean;
  readonly restSecondsValue: string;
  readonly restSecondsIsMixed: boolean;
  readonly tempoValue: string;
  readonly tempoIsMixed: boolean;
  readonly missingDesignedSets: boolean;
  readonly warnings: readonly string[];
};

function uniqueNonEmpty(values: readonly string[]): string[] {
  return [...new Set(values.map((value) => value.trim()).filter((value) => value.length > 0))];
}

function summarizeStringField(
  values: readonly string[],
  mixedLabel = "Mixed",
): { readonly value: string; readonly isMixed: boolean } {
  const unique = uniqueNonEmpty(values);
  if (unique.length === 0) {
    return { value: "", isMixed: false };
  }
  if (unique.length === 1) {
    return { value: unique[0]!, isMixed: false };
  }
  return { value: mixedLabel, isMixed: true };
}

function summarizeNullableNumberField(
  values: readonly (number | null)[],
  mixedLabel = "Mixed",
): { readonly value: string; readonly isMixed: boolean } {
  const defined = values.filter((value): value is number => value !== null && Number.isFinite(value));
  if (defined.length === 0) {
    return { value: "", isMixed: false };
  }
  const unique = [...new Set(defined)];
  if (unique.length === 1) {
    return { value: String(unique[0]), isMixed: false };
  }
  return { value: mixedLabel, isMixed: true };
}

export function formatDesignedSetDetailLine(set: WorkoutDesignedSet): string {
  const intensity =
    set.rirTarget != null && set.rpeTarget == null
      ? `RIR ${set.rirTarget}`
      : set.rpeTarget != null
        ? `RPE ${set.rpeTarget}`
        : null;
  const rest = set.restSeconds != null ? `${set.restSeconds}s` : null;
  const tempo = set.tempo.trim().length > 0 ? set.tempo : null;
  const parts = [
    `Set ${set.setNumber}`,
    set.repRange.trim() || "—",
    intensity,
    rest,
    tempo,
  ].filter((part): part is string => Boolean(part));
  return parts.join(" · ");
}

export function formatExercisePrescriptionHeadline(
  designedSets: readonly WorkoutDesignedSet[],
): string {
  const summary = buildExercisePrescriptionRowSummary(designedSets);
  if (summary.missingDesignedSets) {
    return "0 sets";
  }

  const parts = [
    `${summary.setCount} set${summary.setCount === 1 ? "" : "s"}`,
    !summary.repRangeIsMixed && summary.repRangeValue ? `${summary.repRangeValue} reps` : null,
    !summary.rpeIsMixed && summary.rpeValue ? `RPE ${summary.rpeValue}` : null,
    !summary.restSecondsIsMixed && summary.restSecondsValue
      ? `${summary.restSecondsValue}s rest`
      : null,
    !summary.tempoIsMixed && summary.tempoValue ? `${summary.tempoValue} tempo` : null,
  ].filter((part): part is string => Boolean(part));

  return parts.join(" · ");
}

export function buildExercisePrescriptionRowSummary(
  designedSets: readonly WorkoutDesignedSet[],
): ExercisePrescriptionRowSummary {
  const warnings: string[] = [];

  if (designedSets.length === 0) {
    warnings.push("No designed sets — add at least one set to prescribe this exercise.");
    return {
      setCount: 0,
      repRangeValue: "",
      repRangeIsMixed: false,
      rpeValue: "",
      rpeIsMixed: false,
      restSecondsValue: "",
      restSecondsIsMixed: false,
      tempoValue: "",
      tempoIsMixed: false,
      missingDesignedSets: true,
      warnings,
    };
  }

  const repRange = summarizeStringField(designedSets.map((set) => set.repRange));
  const rpe = summarizeNullableNumberField(designedSets.map((set) => set.rpeTarget));
  const rest = summarizeNullableNumberField(designedSets.map((set) => set.restSeconds));
  const tempo = summarizeStringField(designedSets.map((set) => set.tempo));

  return {
    setCount: designedSets.length,
    repRangeValue: repRange.value,
    repRangeIsMixed: repRange.isMixed,
    rpeValue: rpe.value,
    rpeIsMixed: rpe.isMixed,
    restSecondsValue: rest.value,
    restSecondsIsMixed: rest.isMixed,
    tempoValue: tempo.value,
    tempoIsMixed: tempo.isMixed,
    missingDesignedSets: false,
    warnings,
  };
}
