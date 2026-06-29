import {
  BENCH_PRESS_PILOT_ENABLED_SLOTS,
  isBenchPressPilotExercise,
} from "./data/benchPressMasterMediaPackage";
import {
  REQUIRED_SLOT_TYPES,
  type DifficultyLevel,
  type MediaComposerState,
  type MediaSlotType,
  type TeachingStyle,
  type VisualEmphasis,
} from "./types";

export type MediaComposerOverrides = Partial<
  Pick<
    MediaComposerState,
    | "selectedTeachingStyle"
    | "selectedDifficulty"
    | "selectedTodayFocus"
    | "selectedVisualEmphasis"
    | "coachMessage"
    | "enabledSlots"
    | "clientExperienceMode"
  >
>;

export function buildDefaultMediaComposerState(exerciseId: string): MediaComposerState {
  const enabledSlots = isBenchPressPilotExercise(exerciseId)
    ? [...BENCH_PRESS_PILOT_ENABLED_SLOTS]
    : [...REQUIRED_SLOT_TYPES];

  return {
    exerciseId,
    selectedTeachingStyle: "technical",
    selectedDifficulty: "intermediate",
    selectedTodayFocus: isBenchPressPilotExercise(exerciseId) ? "primaryMuscles" : "setup",
    selectedVisualEmphasis: "primaryMuscles",
    coachMessage: "",
    enabledSlots,
    clientExperienceMode: "standard",
  };
}

export function mergeMediaComposerState(
  exerciseId: string,
  overrides?: MediaComposerOverrides,
): MediaComposerState {
  const defaults = buildDefaultMediaComposerState(exerciseId);
  if (!overrides) return defaults;

  return {
    ...defaults,
    ...overrides,
    enabledSlots: overrides.enabledSlots ?? defaults.enabledSlots,
  };
}

export function applyMediaComposerPatch(
  current: MediaComposerState,
  patch: MediaComposerOverrides,
): MediaComposerState {
  return {
    ...current,
    ...patch,
    enabledSlots: patch.enabledSlots ?? current.enabledSlots,
  };
}

export function isTeachingStyle(value: string): value is TeachingStyle {
  return (
    value === "simple" ||
    value === "technical" ||
    value === "scientific" ||
    value === "athletic" ||
    value === "motivational" ||
    value === "rehab-aware"
  );
}

export function isDifficultyLevel(value: string): value is DifficultyLevel {
  return (
    value === "beginner" ||
    value === "intermediate" ||
    value === "advanced" ||
    value === "elite"
  );
}

export function isVisualEmphasis(value: string): value is VisualEmphasis {
  return (
    value === "primaryMuscles" ||
    value === "secondaryMuscles" ||
    value === "jointPath" ||
    value === "rangeOfMotion" ||
    value === "tempo" ||
    value === "breathing" ||
    value === "setup" ||
    value === "commonMistake"
  );
}

export function isEnabledSlotType(value: string): value is MediaSlotType {
  return (
    value === "heroDemo" ||
    value === "setup" ||
    value === "execution" ||
    value === "slowMotion" ||
    value === "commonMistake" ||
    value === "muscleOverlay" ||
    value === "jointOverlay" ||
    value === "frontAngle" ||
    value === "sideAngle" ||
    value === "closeUp" ||
    value === "coachIntro" ||
    value === "coachNote" ||
    value === "reflection"
  );
}
