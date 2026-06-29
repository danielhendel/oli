import type { ExerciseAcademyEntry, ExerciseMediaSlot } from "@/features/exercise-academy/types";

export type ExerciseMediaTabCardItem = {
  title: string;
  slot: ExerciseMediaSlot | null;
};

const DEFAULT_MEDIA_TITLES = [
  "Hero Demo",
  "Setup",
  "Execution",
  "Slow Motion",
  "Muscle Overlay",
  "Coach Video",
] as const;

/** Deterministic media slot list for the Media tab — architecture-only placeholders. */
export function buildExerciseMediaTabCards(
  academyEntry: ExerciseAcademyEntry | null,
): ExerciseMediaTabCardItem[] {
  if (!academyEntry) {
    return DEFAULT_MEDIA_TITLES.map((title) => ({ title, slot: null }));
  }

  const plan = academyEntry.mediaPlan;

  return [
    { title: "Hero Demo", slot: plan.heroDemo },
    { title: "Setup", slot: plan.setupClip },
    { title: "Execution", slot: plan.executionClip },
    { title: "Slow Motion", slot: plan.slowMotionClip },
    { title: "Muscle Overlay", slot: plan.muscleOverlay },
    {
      title: "Coach Video",
      slot: plan.coachCustomSlots[0] ?? null,
    },
    ...plan.commonMistakeClips.map((item) => ({ title: item.label, slot: item })),
    ...plan.angleClips.map((item) => ({ title: item.label, slot: item })),
    ...plan.coachCustomSlots.slice(1).map((item) => ({ title: item.label, slot: item })),
  ];
}
