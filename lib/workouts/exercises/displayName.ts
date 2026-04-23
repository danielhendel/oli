import { listMergedCustomExerciseRecords } from "@/lib/workouts/exercises/mergeCustomExerciseSources";
import { getBundledExerciseNameById } from "@/lib/workouts/exercises/taxonomyResolve";

function toTitleCaseWords(s: string): string {
  return s
    .split(/\s+/)
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(" ");
}

function safeFallbackExerciseDisplayName(exerciseId: string): string {
  const id = exerciseId.trim();
  if (id.length === 0) return "Exercise";
  if (id.startsWith("custom_")) return "Custom exercise";
  const pretty = id.replace(/_/g, " ").replace(/\s+/g, " ").trim();
  if (pretty.length === 0) return "Exercise";
  return toTitleCaseWords(pretty);
}

export function resolveExerciseDisplayName(
  exerciseId: string,
  customExerciseNameById?: ReadonlyMap<string, string>,
): string {
  const catalogName = getBundledExerciseNameById(exerciseId)?.trim();
  if (catalogName) return catalogName;
  const customName = customExerciseNameById?.get(exerciseId)?.trim();
  if (customName) return customName;
  return safeFallbackExerciseDisplayName(exerciseId);
}

export async function loadCustomExerciseNameById(
  uid: string,
  getIdToken?: () => Promise<string | null>,
): Promise<ReadonlyMap<string, string>> {
  const rows = await listMergedCustomExerciseRecords(uid, getIdToken).catch(() => []);
  return new Map(rows.map((row) => [row.exerciseId, row.name]));
}
