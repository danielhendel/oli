// lib/data/program/buildWorkoutProgramDesignSummary.ts
/**
 * Pure, deterministic summary builders for the Program Design card.
 *
 * Given a {@link WorkoutProgramDesignDraft}, derive the per-category value labels and the
 * full set of row view-models rendered on the Program Design landing card. No IO, no React,
 * no hidden state — easy to unit test.
 */
import type {
  ProgramDesignCategoryId,
  ProgramDesignRowModel,
  WorkoutProgramDesignDraft,
} from "@/lib/data/program/workoutProgramDesignTypes";
import {
  PROGRAM_DESIGN_CATEGORY_ORDER,
  PROGRAM_DESIGN_CATEGORY_ROUTE,
  PROGRAM_DESIGN_CATEGORY_TITLE,
  PROGRAM_DESIGN_MUSCLE_GROUP_ORDER,
  PROGRAM_DESIGN_NOT_SET_LABEL,
  PROGRAM_DESIGN_TRAINING_LEVEL_LABEL,
  WORKOUT_PROGRAM_TYPE_LABEL,
  formatDurationWeeksLabel,
} from "@/lib/data/program/workoutProgramDesignOptions";

/** Count muscle groups that have a configured weekly volume greater than zero. */
export function countConfiguredMuscleGroups(draft: WorkoutProgramDesignDraft): number {
  return PROGRAM_DESIGN_MUSCLE_GROUP_ORDER.reduce((total, muscle) => {
    const sets = draft.muscleGroupVolume[muscle];
    return typeof sets === "number" && sets > 0 ? total + 1 : total;
  }, 0);
}

/** Pluralize "thing" by count, e.g. (5, "day") → "5 days". */
function pluralize(count: number, noun: string): string {
  return `${count} ${noun}${count === 1 ? "" : "s"}`;
}

/** Compute the value-label for a single category (or the "Not set" empty state). */
export function buildProgramDesignCategoryValueLabel(
  category: ProgramDesignCategoryId,
  draft: WorkoutProgramDesignDraft,
): string {
  switch (category) {
    case "type":
      return draft.type ? WORKOUT_PROGRAM_TYPE_LABEL[draft.type] : PROGRAM_DESIGN_NOT_SET_LABEL;
    case "trainingLevel":
      return draft.trainingLevel
        ? PROGRAM_DESIGN_TRAINING_LEVEL_LABEL[draft.trainingLevel]
        : PROGRAM_DESIGN_NOT_SET_LABEL;
    case "duration":
      return draft.durationWeeks != null
        ? formatDurationWeeksLabel(draft.durationWeeks)
        : PROGRAM_DESIGN_NOT_SET_LABEL;
    case "muscleGroupVolume": {
      const configured = countConfiguredMuscleGroups(draft);
      return configured > 0
        ? `${pluralize(configured, "muscle group")} configured`
        : PROGRAM_DESIGN_NOT_SET_LABEL;
    }
    case "weeklySplit":
      return draft.weeklySplit && draft.weeklySplit.dayCount > 0
        ? `${pluralize(draft.weeklySplit.dayCount, "day")} configured`
        : PROGRAM_DESIGN_NOT_SET_LABEL;
  }
}

/** Whether a category currently has a value set (drives styling + a11y). */
export function isProgramDesignCategorySet(
  category: ProgramDesignCategoryId,
  draft: WorkoutProgramDesignDraft,
): boolean {
  return (
    buildProgramDesignCategoryValueLabel(category, draft) !== PROGRAM_DESIGN_NOT_SET_LABEL
  );
}

/** Build the ordered set of Program Design row view-models from a draft. */
export function buildProgramDesignRows(
  draft: WorkoutProgramDesignDraft,
): ProgramDesignRowModel[] {
  return PROGRAM_DESIGN_CATEGORY_ORDER.map((id) => {
    const title = PROGRAM_DESIGN_CATEGORY_TITLE[id];
    const valueLabel = buildProgramDesignCategoryValueLabel(id, draft);
    const isSet = valueLabel !== PROGRAM_DESIGN_NOT_SET_LABEL;
    return {
      id,
      title,
      valueLabel,
      isSet,
      href: PROGRAM_DESIGN_CATEGORY_ROUTE[id],
      accessibilityLabel: `${title}, ${valueLabel}`,
    };
  });
}
