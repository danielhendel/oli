import type { ExerciseAcademyEntry, ExerciseKnowledgeQuality } from "./types";

function hasText(value: string): boolean {
  return value.trim().length > 0;
}

function hasItems(values: string[]): boolean {
  return values.some((value) => value.trim().length > 0);
}

/**
 * Deterministic completeness score for academy teaching content.
 * Max score 100 — 12.5 points per dimension (8 dimensions).
 */
export function buildExerciseKnowledgeQuality(
  entry: Pick<
    ExerciseAcademyEntry,
    "teaching" | "programming" | "mediaPlan"
  >,
): ExerciseKnowledgeQuality {
  const { teaching, programming, mediaPlan } = entry;

  const hasOverview = hasText(teaching.overview);
  const hasSetup = hasText(teaching.setup);
  const hasExecution = hasText(teaching.execution);
  const hasCues = hasItems(teaching.coachingCues);
  const hasMistakes = hasItems(teaching.commonMistakes);
  const hasFeelGuide = hasItems(teaching.shouldFeel);
  const hasProgression = hasItems(programming.progressionOptions);
  const hasMediaPlan = mediaPlan.status === "planned" || mediaPlan.status === "partial" || mediaPlan.status === "complete";

  const flags = [
    hasOverview,
    hasSetup,
    hasExecution,
    hasCues,
    hasMistakes,
    hasFeelGuide,
    hasProgression,
    hasMediaPlan,
  ];

  const score = Math.round((flags.filter(Boolean).length / flags.length) * 100);

  const missingItems: string[] = [];
  if (!hasOverview) missingItems.push("overview");
  if (!hasSetup) missingItems.push("setup");
  if (!hasExecution) missingItems.push("execution");
  if (!hasCues) missingItems.push("coaching cues");
  if (!hasMistakes) missingItems.push("common mistakes");
  if (!hasFeelGuide) missingItems.push("feel guide");
  if (!hasProgression) missingItems.push("progression");
  if (!hasMediaPlan) missingItems.push("media plan");

  return {
    score,
    hasOverview,
    hasSetup,
    hasExecution,
    hasCues,
    hasMistakes,
    hasFeelGuide,
    hasProgression,
    hasMediaPlan,
    missingItems,
  };
}
