import {
  BENCH_PRESS_PILOT_PACKAGE_VERSION,
  CLIENT_TIMELINE_SLOT_ORDER,
  DIFFICULTY_LEVELS,
  TEACHING_STYLES,
  VISUAL_EMPHASIS_OPTIONS,
  type MasterMediaPackage,
  type MediaSlot,
  type MediaSlotType,
} from "../types";

export const BENCH_PRESS_PILOT_EXERCISE_ID = "bench_press" as const;

/** Timeline slots enabled by default for the bench press pilot experience. */
export const BENCH_PRESS_PILOT_ENABLED_SLOTS: MediaSlotType[] = [
  "coachIntro",
  "heroDemo",
  "setup",
  "execution",
  "commonMistake",
  "slowMotion",
  "muscleOverlay",
  "reflection",
];

type PilotSlotInput = {
  slotType: MediaSlotType;
  title: string;
  purpose: string;
  durationSeconds: number;
  required: boolean;
  assetKind: MediaSlot["assetKind"];
  visualTreatment: MediaSlot["visualTreatment"];
  visualTheme: string;
  placeholderVisualLabel: string;
  clientPurpose: string;
  professionalPurpose: string;
};

const BENCH_PRESS_PILOT_SLOTS: PilotSlotInput[] = [
  {
    slotType: "coachIntro",
    title: "Coach Introduction",
    purpose: "Open the lesson with intent and confidence before the first rep.",
    durationSeconds: 18,
    required: true,
    assetKind: "placeholder-narration",
    visualTreatment: "coach-intro",
    visualTheme: "dark-gym-welcome",
    placeholderVisualLabel: "Coach welcome · dark gym",
    clientPurpose: "Understand today's chest-focus session and what success looks like.",
    professionalPurpose: "Set session intent — customize with your coach message overlay.",
  },
  {
    slotType: "heroDemo",
    title: "Movement Demonstration",
    purpose: "Full-speed bench press demonstration at working tempo.",
    durationSeconds: 52,
    required: true,
    assetKind: "placeholder-video",
    visualTreatment: "cinematic",
    visualTheme: "bench-press-hero",
    placeholderVisualLabel: "Full demo · cinematic bar path",
    clientPurpose: "See the complete bench press pattern before you setup.",
    professionalPurpose: "Anchor the lesson with world-class demonstration footage.",
  },
  {
    slotType: "setup",
    title: "Setup",
    purpose: "Bar position, scapular setup, foot drive, and grip width.",
    durationSeconds: 38,
    required: true,
    assetKind: "placeholder-video",
    visualTreatment: "cinematic",
    visualTheme: "bench-setup-chest",
    placeholderVisualLabel: "Setup · arch & grip",
    clientPurpose: "Find your starting position with stable shoulders and bar path.",
    professionalPurpose: "Reduce setup errors before load increases.",
  },
  {
    slotType: "execution",
    title: "Execution",
    purpose: "Rep-by-rep pressing with controlled eccentric and strong lockout.",
    durationSeconds: 65,
    required: true,
    assetKind: "placeholder-video",
    visualTreatment: "cinematic",
    visualTheme: "bench-execution-tempo",
    placeholderVisualLabel: "Execution · controlled reps",
    clientPurpose: "Learn the rep rhythm — descent, touch, drive, lockout.",
    professionalPurpose: "Connect tempo cues to what the client should feel.",
  },
  {
    slotType: "commonMistake",
    title: "Common Mistake",
    purpose: "Elbow flare and loose upper-back setup during the press.",
    durationSeconds: 28,
    required: true,
    assetKind: "placeholder-video",
    visualTreatment: "lesson-card",
    visualTheme: "bench-mistake-elbows",
    placeholderVisualLabel: "Mistake · elbow flare",
    clientPurpose: "Recognize elbow flare and how to correct it immediately.",
    professionalPurpose: "Preempt the most common bench press breakdown.",
  },
  {
    slotType: "slowMotion",
    title: "Slow Motion",
    purpose: "Touch-and-go tempo with pause at the chest.",
    durationSeconds: 35,
    required: false,
    assetKind: "placeholder-video",
    visualTreatment: "slow-motion",
    visualTheme: "bench-slow-motion",
    placeholderVisualLabel: "Slow motion · chest touch",
    clientPurpose: "Feel the bottom position and bar path in slow motion.",
    professionalPurpose: "Emphasize tempo when Today's Goal focuses on control.",
  },
  {
    slotType: "muscleOverlay",
    title: "Muscle Overlay",
    purpose: "Chest and triceps activation with anterior deltoid stabilization.",
    durationSeconds: 32,
    required: false,
    assetKind: "placeholder-overlay",
    visualTreatment: "anatomy-overlay",
    visualTheme: "chest-activation-overlay",
    placeholderVisualLabel: "Overlay · chest & triceps",
    clientPurpose: "See which muscles drive the press and stabilize the shoulder.",
    professionalPurpose: "Support activation-focused coaching for chest emphasis days.",
  },
  {
    slotType: "reflection",
    title: "Reflection",
    purpose: "Post-set confidence check and technique quality prompts.",
    durationSeconds: 22,
    required: false,
    assetKind: "placeholder-narration",
    visualTreatment: "lesson-card",
    visualTheme: "bench-reflection",
    placeholderVisualLabel: "Reflection · technique check",
    clientPurpose: "Pause, rate your technique, and carry one cue into the next set.",
    professionalPurpose: "Close the lesson loop before the client logs the set.",
  },
];

function buildPilotSlot(input: PilotSlotInput): MediaSlot {
  return {
    slotId: `bench-press-${input.slotType}`,
    slotType: input.slotType,
    title: input.title,
    purpose: input.purpose,
    required: input.required,
    recommendedDurationSeconds: input.durationSeconds,
    outputFormats: ["mp4", "hls"],
    status: "approved",
    source: "oli-master",
    assetKind: input.assetKind,
    visualTreatment: input.visualTreatment,
    visualTheme: input.visualTheme,
    placeholderVisualLabel: input.placeholderVisualLabel,
    clientPurpose: input.clientPurpose,
    professionalPurpose: input.professionalPurpose,
  };
}

/** Local high-fidelity pilot master media package for bench_press (placeholder assets only). */
export function buildBenchPressPilotMasterMediaPackage(): MasterMediaPackage {
  const slots = BENCH_PRESS_PILOT_SLOTS.map(buildPilotSlot);
  const estimatedDurationSeconds = slots.reduce(
    (sum, slot) => sum + slot.recommendedDurationSeconds,
    0,
  );

  return {
    exerciseId: BENCH_PRESS_PILOT_EXERCISE_ID,
    packageVersion: BENCH_PRESS_PILOT_PACKAGE_VERSION,
    status: "complete",
    slots,
    availableTeachingStyles: [...TEACHING_STYLES],
    availableDifficultyLevels: [...DIFFICULTY_LEVELS],
    availableVisualEmphasis: [...VISUAL_EMPHASIS_OPTIONS],
    estimatedDurationSeconds,
    qualityScore: 100,
    reviewedAt: "2026-06-01T00:00:00.000Z",
    reviewedBy: "oli-media-pilot",
  };
}

export function isBenchPressPilotExercise(exerciseId: string): boolean {
  return exerciseId === BENCH_PRESS_PILOT_EXERCISE_ID;
}

export function benchPressPilotTimelineSlotOrder(): MediaSlotType[] {
  return BENCH_PRESS_PILOT_SLOTS.map((slot) => slot.slotType).filter((slotType) =>
    CLIENT_TIMELINE_SLOT_ORDER.includes(slotType),
  );
}
