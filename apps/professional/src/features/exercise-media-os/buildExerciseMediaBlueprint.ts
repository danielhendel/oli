import {
  CLIENT_TIMELINE_SLOT_ORDER,
  DIFFICULTY_LEVELS,
  EXERCISE_MEDIA_BLUEPRINT_VERSION,
  OPTIONAL_SLOT_TYPES,
  REQUIRED_SLOT_TYPES,
  TEACHING_STYLES,
  VISUAL_EMPHASIS_OPTIONS,
  type ClientExperiencePhase,
  type ExerciseMediaBlueprint,
  type MediaBlueprintInput,
  type MediaOutputFormat,
  type MediaSlot,
  type MediaSlotType,
  type PersonalizationOptions,
} from "./types";

const OUTPUT_FORMATS: MediaOutputFormat[] = ["mp4", "hls"];

const SLOT_DURATIONS: Record<MediaSlotType, number> = {
  heroDemo: 45,
  setup: 30,
  execution: 60,
  slowMotion: 30,
  commonMistake: 25,
  muscleOverlay: 20,
  jointOverlay: 20,
  frontAngle: 20,
  sideAngle: 20,
  closeUp: 15,
  coachIntro: 15,
  coachNote: 15,
  reflection: 20,
};

const SLOT_TITLES: Record<MediaSlotType, string> = {
  heroDemo: "Hero Demo",
  setup: "Setup",
  execution: "Execution",
  slowMotion: "Slow Motion",
  commonMistake: "Common Mistake",
  muscleOverlay: "Muscle Overlay",
  jointOverlay: "Joint Overlay",
  frontAngle: "Front Angle",
  sideAngle: "Side Angle",
  closeUp: "Close-Up",
  coachIntro: "Coach Intro",
  coachNote: "Coach Note",
  reflection: "Reflection",
};

function buildSlot(
  exerciseName: string,
  slotType: MediaSlotType,
  required: boolean,
): MediaSlot {
  return {
    slotId: slotType,
    slotType,
    title: SLOT_TITLES[slotType],
    purpose: buildSlotPurpose(exerciseName, slotType),
    required,
    recommendedDurationSeconds: SLOT_DURATIONS[slotType],
    outputFormats: OUTPUT_FORMATS,
    status: "planned",
  };
}

function buildSlotPurpose(exerciseName: string, slotType: MediaSlotType): string {
  switch (slotType) {
    case "heroDemo":
      return `Full demonstration of ${exerciseName} at working tempo.`;
    case "setup":
      return `Equipment setup and starting position for ${exerciseName}.`;
    case "execution":
      return `Rep-by-rep execution of ${exerciseName}.`;
    case "slowMotion":
      return `Slow-motion highlight of key positions for ${exerciseName}.`;
    case "commonMistake":
      return `Example of a frequent form error during ${exerciseName}.`;
    case "muscleOverlay":
      return `Animated muscle emphasis overlay for ${exerciseName}.`;
    case "jointOverlay":
      return `Joint path and alignment overlay for ${exerciseName}.`;
    case "frontAngle":
      return `Front view of ${exerciseName}.`;
    case "sideAngle":
      return `Side view of ${exerciseName}.`;
    case "closeUp":
      return `Close-up of grip, foot, or joint alignment for ${exerciseName}.`;
    case "coachIntro":
      return `Optional coach-branded intro for ${exerciseName}.`;
    case "coachNote":
      return `Optional coach voice-over or note overlay.`;
    case "reflection":
      return `Post-set reflection prompts for ${exerciseName}.`;
  }
}

function defaultPersonalizationOptions(): PersonalizationOptions {
  return {
    teachingStyles: [...TEACHING_STYLES],
    difficultyLevels: [...DIFFICULTY_LEVELS],
    visualEmphasis: [...VISUAL_EMPHASIS_OPTIONS],
    clientExperienceModes: ["standard", "compact", "immersive"],
  };
}

function defaultClientExperiencePhases(): ClientExperiencePhase[] {
  return [
    {
      phaseId: "orient",
      label: "Orient",
      slotTypes: ["coachIntro", "heroDemo"],
    },
    {
      phaseId: "learn",
      label: "Learn",
      slotTypes: ["setup", "execution", "commonMistake"],
    },
    {
      phaseId: "refine",
      label: "Refine",
      slotTypes: ["slowMotion", "muscleOverlay", "jointOverlay"],
    },
    {
      phaseId: "reflect",
      label: "Reflect",
      slotTypes: ["reflection", "coachNote"],
    },
  ];
}

/** Deterministic media blueprint for a canonical exercise. */
export function buildExerciseMediaBlueprint(input: MediaBlueprintInput): ExerciseMediaBlueprint {
  const requiredSlots = REQUIRED_SLOT_TYPES.map((slotType) =>
    buildSlot(input.exerciseName, slotType, true),
  );
  const optionalSlots = OPTIONAL_SLOT_TYPES.map((slotType) =>
    buildSlot(input.exerciseName, slotType, false),
  );

  return {
    exerciseId: input.exerciseId,
    exerciseName: input.exerciseName,
    blueprintVersion: EXERCISE_MEDIA_BLUEPRINT_VERSION,
    requiredSlots,
    optionalSlots,
    personalizationOptions: defaultPersonalizationOptions(),
    clientExperiencePhases: defaultClientExperiencePhases(),
    reviewStatus: "draft",
  };
}

export function allBlueprintSlotTypes(): MediaSlotType[] {
  return [...REQUIRED_SLOT_TYPES, ...OPTIONAL_SLOT_TYPES];
}

export function timelineSlotOrder(): MediaSlotType[] {
  return [...CLIENT_TIMELINE_SLOT_ORDER];
}

export { SLOT_DURATIONS, SLOT_TITLES };
