export const WORKOUT_STUDIO_MODES = [
  {
    id: "overview",
    label: "Overview",
    description: "Name and define the workout.",
  },
  {
    id: "stats",
    label: "Workout Stats",
    description: "Volume, balance, risk, and quality.",
  },
  {
    id: "blocks",
    label: "Workout",
    description: "Build the workout.",
  },
] as const;

export type WorkoutStudioMode = (typeof WORKOUT_STUDIO_MODES)[number]["id"];

export const WORKOUT_STUDIO_MODE_IDS: readonly WorkoutStudioMode[] = WORKOUT_STUDIO_MODES.map(
  (mode) => mode.id,
);

export const WORKOUT_STUDIO_MODE_LABELS: Record<WorkoutStudioMode, string> = {
  overview: "Overview",
  stats: "Workout Stats",
  blocks: "Workout",
};

/** @deprecated UX-2 — scroll-spy sections replaced by WORKOUT_STUDIO_MODES */
export const BUILDER_NAV_SECTIONS = [
  "overview",
  "projectedVolume",
  "blocks",
  "library",
  "quality",
  "preview",
  "tools",
] as const;

/** @deprecated UX-2 — use WorkoutStudioMode */
export type BuilderNavSection = (typeof BUILDER_NAV_SECTIONS)[number];

/** @deprecated UX-2 */
export const BUILDER_NAV_LABELS: Record<BuilderNavSection, string> = {
  overview: "Overview",
  projectedVolume: "Projected Volume",
  blocks: "Blocks",
  library: "Exercise Library",
  quality: "Workout Quality",
  preview: "Preview",
  tools: "Notes / Tools",
};
