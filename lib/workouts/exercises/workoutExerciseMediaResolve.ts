/**
 * Resolve remote media URLs for workout log / thumbnails.
 * Order: current custom definition (store) → session snapshot → caller applies bundled vs placeholder.
 */

export type SessionExerciseMediaSnapshot = { imageUrl?: string; videoUrl?: string };

export type CustomExerciseMediaFields = {
  imageUrl?: string;
  videoUrl?: string;
  mediaUrl?: string;
};

export function resolveWorkoutExerciseRemoteImageUri(
  custom: CustomExerciseMediaFields | null | undefined,
  session: SessionExerciseMediaSnapshot | null | undefined,
): string | null {
  for (const u of [custom?.imageUrl, custom?.mediaUrl, session?.imageUrl]) {
    const t = typeof u === "string" ? u.trim() : "";
    if (t.length > 0) return t;
  }
  return null;
}

export function resolveWorkoutExerciseRemoteVideoUri(
  custom: CustomExerciseMediaFields | null | undefined,
  session: SessionExerciseMediaSnapshot | null | undefined,
): string | null {
  for (const u of [custom?.videoUrl, session?.videoUrl]) {
    const t = typeof u === "string" ? u.trim() : "";
    if (t.length > 0) return t;
  }
  return null;
}
