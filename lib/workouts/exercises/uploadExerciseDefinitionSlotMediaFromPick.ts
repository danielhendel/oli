/**
 * Upload a picked local file for an exercise definition media slot (shared by edit screen + library picker).
 */
import { uploadExerciseDefinitionMediaFile } from "@/lib/api/exerciseDefinitionMedia";
import { readLocalUriAsBase64, type ExerciseMediaSlot } from "@/lib/workouts/exercises/pickExerciseMedia";

export async function uploadExerciseDefinitionSlotMediaFromPick(
  exerciseId: string,
  slot: ExerciseMediaSlot,
  picked: { uri: string; mimeType: string; filename: string },
  getIdToken: (forceRefresh: boolean) => Promise<string | null>,
): Promise<string> {
  const b64 = await readLocalUriAsBase64(picked.uri);
  const token = await getIdToken(false);
  if (!token) throw new Error("Sign in required to upload.");
  const res = await uploadExerciseDefinitionMediaFile(token, exerciseId, {
    slot,
    fileBase64: b64,
    mimeType: picked.mimeType,
    filename: picked.filename,
  });
  if (!res.ok) throw new Error(res.error ?? "Upload failed.");
  return res.json.url;
}
