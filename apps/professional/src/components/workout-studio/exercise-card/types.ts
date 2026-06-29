export const EXERCISE_CARD_TABS = [
  "sets",
  "media",
  "lesson",
  "coaching",
  "progression",
  "tracking",
] as const;

export type ExerciseCardTab = (typeof EXERCISE_CARD_TABS)[number];

export const EXERCISE_CARD_TAB_LABELS: Record<ExerciseCardTab, string> = {
  sets: "Sets",
  media: "Media",
  lesson: "Lesson",
  coaching: "Coaching",
  progression: "Progression",
  tracking: "Tracking",
};

export const EXERCISE_CARD_TAB_HINTS: Record<ExerciseCardTab, string> = {
  sets: "Design prescription and per-set targets",
  media: "Design how your client learns this movement.",
  lesson: "Build the learning experience",
  coaching: "Your voice for this client",
  progression: "Adaptation, swaps, and guardrails",
  tracking: "What the client logs in session",
};
