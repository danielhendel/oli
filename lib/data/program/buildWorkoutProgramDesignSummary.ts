// lib/data/program/buildWorkoutProgramDesignSummary.ts
/**
 * Pure, deterministic summary builders for the Program Design card.
 *
 * Given a {@link WorkoutProgramDesignDraft}, derive the per-category value labels and the full set
 * of row view-models rendered on the Program Design landing card. No IO, no React, no hidden state.
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
  PROGRAM_DESIGN_GOAL_LABEL,
  PROGRAM_DESIGN_NOT_SET_LABEL,
  PROGRAM_DESIGN_SEX_LABEL,
  PROGRAM_DESIGN_TRAINING_LEVEL_LABEL,
  TRAINING_TYPE_LABEL,
  formatAgeLabel,
  formatTrainingDaysLabel,
} from "@/lib/data/program/workoutProgramDesignOptions";

/** Compute the value-label for a single category (or the "Not set" empty state). */
export function buildProgramDesignCategoryValueLabel(
  category: ProgramDesignCategoryId,
  draft: WorkoutProgramDesignDraft,
): string {
  switch (category) {
    case "sex":
      return draft.sex ? PROGRAM_DESIGN_SEX_LABEL[draft.sex] : PROGRAM_DESIGN_NOT_SET_LABEL;
    case "age":
      return draft.age != null ? formatAgeLabel(draft.age) : PROGRAM_DESIGN_NOT_SET_LABEL;
    case "trainingLevel":
      return draft.trainingLevel
        ? PROGRAM_DESIGN_TRAINING_LEVEL_LABEL[draft.trainingLevel]
        : PROGRAM_DESIGN_NOT_SET_LABEL;
    case "trainingDays":
      return draft.trainingDays != null
        ? formatTrainingDaysLabel(draft.trainingDays)
        : PROGRAM_DESIGN_NOT_SET_LABEL;
    case "goal":
      return draft.goal ? PROGRAM_DESIGN_GOAL_LABEL[draft.goal] : PROGRAM_DESIGN_NOT_SET_LABEL;
    case "trainingType":
      return draft.trainingType
        ? TRAINING_TYPE_LABEL[draft.trainingType]
        : PROGRAM_DESIGN_NOT_SET_LABEL;
  }
}

/** Whether a category currently has a value set (drives styling + a11y). */
export function isProgramDesignCategorySet(
  category: ProgramDesignCategoryId,
  draft: WorkoutProgramDesignDraft,
): boolean {
  return buildProgramDesignCategoryValueLabel(category, draft) !== PROGRAM_DESIGN_NOT_SET_LABEL;
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
