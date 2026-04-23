/**
 * One-shot migration: POST each local custom exercise missing on the server.
 * Preserves stable `custom_*` ids via create body.exerciseId. Local rows are not deleted.
 */
import { createExerciseDefinition, listExerciseDefinitions } from "@/lib/api/exerciseDefinitions";
import { listCustomExercises } from "@/lib/workouts/exercises/customExerciseStore";

export type MigrateCustomExercisesToBackendResult = {
  migrated: number;
  skippedAlreadyOnServer: number;
  failed: number;
};

export async function migrateLocalCustomExercisesToBackend(
  uid: string,
  getIdToken: () => Promise<string | null>,
): Promise<MigrateCustomExercisesToBackendResult> {
  const token = await getIdToken();
  if (!token) {
    return { migrated: 0, skippedAlreadyOnServer: 0, failed: 0 };
  }

  const local = await listCustomExercises(uid).catch(() => []);
  const listed = await listExerciseDefinitions(token);
  if (!listed.ok) {
    return { migrated: 0, skippedAlreadyOnServer: 0, failed: local.length };
  }

  const serverIds = new Set(listed.json.items.map((r) => r.exerciseId));
  let migrated = 0;
  let skippedAlreadyOnServer = 0;
  let failed = 0;

  for (const row of local) {
    if (serverIds.has(row.exerciseId)) {
      skippedAlreadyOnServer += 1;
      continue;
    }
    const res = await createExerciseDefinition(token, {
      name: row.name,
      equipment: row.equipment,
      primary: row.primary,
      loggingType: row.loggingType,
      exerciseId: row.exerciseId,
    });
    if (res.ok) {
      migrated += 1;
      serverIds.add(row.exerciseId);
    } else {
      failed += 1;
    }
  }

  return { migrated, skippedAlreadyOnServer, failed };
}
