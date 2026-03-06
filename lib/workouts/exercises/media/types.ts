export type ExerciseImageSource =
  | { kind: "bundled"; asset: number }
  | { kind: "none" };

/** Bundled media for an exercise: thumbnail (required for display) and optional loop video. */
export type ExerciseMedia = {
  thumbnail: number;
  loopVideo?: number;
};
