// lib/data/program/buildProgramHomeModel.ts
/**
 * Pure, deterministic selector that builds the Program Home view-model.
 *
 * All four builders are now routed (app/(app)/program/*), so every card is enabled and
 * navigates to its page. Workout is the first real v1 builder; cardio/nutrition/recovery
 * open premium placeholder pages. No IO, no Firebase, no API — see types.ts for persistence
 * intent. When persistence/deep builders land, this selector will reflect real completion
 * status without the screen or card components changing shape.
 */
import {
  PROGRAM_BUILDER_ORDER,
  PROGRAM_BUILDER_ROUTE,
  type ProgramBuilderCardModel,
  type ProgramBuilderStatus,
  type ProgramBuilderType,
  type ProgramHomeModel,
} from "@/lib/data/program/types";

type BuilderCopy = {
  title: string;
  description: string;
  ctaLabel: string;
  status: ProgramBuilderStatus;
  statusLabel: string;
};

const BUILDER_COPY: Record<ProgramBuilderType, BuilderCopy> = {
  workout: {
    title: "Workout Builder",
    description: "Design strength workouts: exercises, sets, reps, tempo, rest, and weekly volume.",
    ctaLabel: "Build",
    status: "not_started",
    statusLabel: "Build v1",
  },
  cardio: {
    title: "Cardio Builder",
    description: "Plan Zone 2, VO₂ max, steps, and heart-rate targets with weekly scorecards.",
    ctaLabel: "Preview",
    status: "missing",
    statusLabel: "Preview",
  },
  nutrition: {
    title: "Nutrition Builder",
    description: "Set calories, macros by day, meal timing, hydration, and adjustment rules.",
    ctaLabel: "Preview",
    status: "missing",
    statusLabel: "Preview",
  },
  recovery: {
    title: "Recovery Builder",
    description: "Tune sleep, readiness, soreness, mobility, and deload rules for a recovery score.",
    ctaLabel: "Preview",
    status: "missing",
    statusLabel: "Preview",
  },
};

function buildBuilderCard(type: ProgramBuilderType): ProgramBuilderCardModel {
  const copy = BUILDER_COPY[type];
  return {
    type,
    title: copy.title,
    description: copy.description,
    status: copy.status,
    statusLabel: copy.statusLabel,
    ctaLabel: copy.ctaLabel,
    // All builders are routed now → cards navigate (no longer disabled).
    disabled: false,
    href: PROGRAM_BUILDER_ROUTE[type],
  };
}

/**
 * Build the Program Home model. v1 takes no input and returns the command-center state.
 * The optional signature is reserved so future callers can pass persisted programs.
 */
export function buildProgramHomeModel(): ProgramHomeModel {
  return {
    activeProgram: null,
    builders: PROGRAM_BUILDER_ORDER.map(buildBuilderCard),
    savedPrograms: [],
    sharedPrograms: [],
  };
}
