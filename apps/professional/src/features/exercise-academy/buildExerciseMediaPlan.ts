import type {
  ExerciseMediaSlot,
  ExerciseMediaSlotKind,
  ExerciseMediaPlanStatus,
  ExerciseTeaching,
} from "./types";

type MediaPlanInput = {
  exerciseId: string;
  exerciseName: string;
  teaching: ExerciseTeaching;
};

const PLANNED_SLOT: ExerciseMediaSlot["status"] = "planned";

function slot(
  slotId: ExerciseMediaSlotKind,
  label: string,
  description: string,
): ExerciseMediaSlot {
  return { slotId, label, status: PLANNED_SLOT, description };
}

export function buildExerciseMediaPlan(input: MediaPlanInput) {
  const { exerciseName } = input;

  const heroDemo = slot(
    "hero-demo",
    "Hero demo",
    `Full demonstration of ${exerciseName} at working tempo.`,
  );
  const setupClip = slot("setup", "Setup", `Equipment setup and starting position for ${exerciseName}.`);
  const executionClip = slot(
    "execution",
    "Execution",
    `Rep-by-rep execution of ${exerciseName}.`,
  );
  const slowMotionClip = slot(
    "slow-motion",
    "Slow motion",
    `Slow-motion highlight of key positions for ${exerciseName}.`,
  );

  const commonMistakeClips = [
    slot(
      "common-mistake",
      "Common mistake",
      `Example of a frequent form error during ${exerciseName}.`,
    ),
  ];

  const angleClips = [
    slot("front-angle", "Front angle", `Front view of ${exerciseName}.`),
    slot("side-angle", "Side angle", `Side view of ${exerciseName}.`),
    slot("close-up", "Close-up", `Close-up of grip, foot, or joint alignment for ${exerciseName}.`),
  ];

  const muscleOverlay = slot(
    "muscle-overlay",
    "Muscle overlay",
    `Animated muscle emphasis overlay for ${exerciseName}.`,
  );

  const coachCustomSlots = [
    slot(
      "coach-intro-custom",
      "Coach intro (custom)",
      "Optional coach-branded intro clip for this exercise.",
    ),
    slot(
      "coach-note-custom",
      "Coach note (custom)",
      "Optional coach voice-over or note overlay.",
    ),
  ];

  const allSlots: ExerciseMediaSlot[] = [
    heroDemo,
    setupClip,
    executionClip,
    slowMotionClip,
    ...commonMistakeClips,
    ...angleClips,
    muscleOverlay,
    ...coachCustomSlots,
  ];

  const missingSlotIds = allSlots
    .filter((s) => s.status === "missing")
    .map((s) => s.slotId);

  const plannedCount = allSlots.filter((s) => s.status === "planned").length;

  const status: ExerciseMediaPlanStatus =
    missingSlotIds.length === allSlots.length
      ? "missing"
      : plannedCount === allSlots.length
        ? "planned"
        : missingSlotIds.length > 0
          ? "partial"
          : "complete";

  return {
    heroDemo,
    setupClip,
    executionClip,
    slowMotionClip,
    commonMistakeClips,
    angleClips,
    muscleOverlay,
    coachCustomSlots,
    status,
    missingSlotIds,
  };
}
