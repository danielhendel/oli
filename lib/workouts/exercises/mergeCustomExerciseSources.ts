/**
 * Merge backend exercise definitions with device-local AsyncStorage rows.
 * Backend wins on id collision; local-only ids are retained for rollout / offline.
 */
import { listExerciseDefinitions } from "@/lib/api/exerciseDefinitions";
import {
  customExerciseRecordFromDefinitionRow,
  listCustomExercises,
  type CustomExerciseRecord,
} from "@/lib/workouts/exercises/customExerciseStore";

/**
 * Returns merged custom exercises: remote first, then locals not present remotely.
 * When `getIdToken` is missing or returns null, returns local-only list (backward compatible).
 */
export async function listMergedCustomExerciseRecords(
  uid: string,
  getIdToken?: () => Promise<string | null>,
): Promise<CustomExerciseRecord[]> {
  const local = await listCustomExercises(uid).catch(() => []);
  const token = getIdToken ? await getIdToken() : null;
  if (!token) return local;

  const remote = await listExerciseDefinitions(token);
  if (!remote.ok) return local;

  const byId = new Map<string, CustomExerciseRecord>();
  for (const row of remote.json.items) {
    byId.set(row.exerciseId, customExerciseRecordFromDefinitionRow(row));
  }
  for (const row of local) {
    if (!byId.has(row.exerciseId)) {
      byId.set(row.exerciseId, row);
    }
  }
  return [...byId.values()].sort((a, b) => a.exerciseId.localeCompare(b.exerciseId));
}
