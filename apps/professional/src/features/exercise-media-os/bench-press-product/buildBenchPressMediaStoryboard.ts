import { EXERCISE_ACADEMY_VERSION } from "../../exercise-academy/types";
import { getExerciseAcademyIntelligenceById } from "../../exercise-academy/exerciseAcademyIntelligenceRegistry";
import { getExerciseAcademyEntryById } from "../../exercise-academy/exerciseAcademyAdapter";
import { listCanonicalWorkoutLibraryExercises } from "../../workout-studio/exerciseLibraryAdapter";
import {
  buildBenchPressPilotMasterMediaPackage,
  BENCH_PRESS_PILOT_ENABLED_SLOTS,
} from "../data/benchPressMasterMediaPackage";
import type { MasterMediaPackage, MediaSlot, MediaSlotType } from "../types";

import {
  BENCH_PRESS_PRODUCT_CREATED_FOR,
  BENCH_PRESS_PRODUCT_EXERCISE_ID,
  BENCH_PRESS_PRODUCT_VERSION,
  BENCH_PRESS_STORYBOARD_VERSION,
} from "./benchPressProductConstants";
import type { AcademyReference, BenchPressMediaStoryboard, BenchPressStoryboardScene } from "./types";

export type BenchPressStoryboardInput = {
  mediaPackage?: MasterMediaPackage;
};

function ref(
  source: AcademyReference["source"],
  field: string,
  summary: string,
): AcademyReference {
  return { source, field, summary };
}

function buildSharedAcademyReferences(): AcademyReference[] {
  const library = listCanonicalWorkoutLibraryExercises();
  const academy = getExerciseAcademyEntryById(BENCH_PRESS_PRODUCT_EXERCISE_ID, library);
  if (!academy) return [];

  return [
    ref("academy", "identity.name", academy.exerciseName),
    ref("academy", "identity.movementPattern", academy.identity.movementPattern ?? "push"),
    ref("academy", "identity.primaryMuscles", academy.identity.primaryMuscles.join(", ")),
    ref("academy", "teaching.overview", academy.teaching.overview.slice(0, 120)),
  ];
}

function buildSharedIntelligenceReferences(): AcademyReference[] {
  const intelligence = getExerciseAcademyIntelligenceById(BENCH_PRESS_PRODUCT_EXERCISE_ID);
  if (!intelligence) return [];

  return [
    ref("intelligence", "primaryMuscles", intelligence.primaryMuscles.join(", ")),
    ref("intelligence", "secondaryMuscles", intelligence.secondaryMuscles.join(", ")),
    ref("intelligence", "movementAnalysis.pattern", intelligence.movementAnalysis.pattern),
    ref("intelligence", "movementAnalysis.plane", intelligence.movementAnalysis.plane),
    ref(
      "intelligence",
      "coachingDecisionNotes",
      intelligence.coachingDecisionNotes.slice(0, 120),
    ),
  ];
}

function sceneStoryboardFields(
  slot: MediaSlot,
  index: number,
  slots: MediaSlot[],
): Omit<
  BenchPressStoryboardScene,
  "sceneId" | "slotId" | "slotType" | "title" | "purpose" | "durationSeconds"
> {
  const next = slots[index + 1];
  const sharedAcademy = buildSharedAcademyReferences();
  const sharedIntel = buildSharedIntelligenceReferences();

  const baseTransition = next
    ? `Transition into ${next.title} — maintain focus on the lesson arc.`
    : "Close the lesson and prepare the client to log their set.";

  const packageRef = ref(
    "media-package",
    `slots.${slot.slotType}.placeholderVisualLabel`,
    slot.placeholderVisualLabel ?? slot.title,
  );

  switch (slot.slotType) {
    case "coachIntro":
      return {
        clientLearningObjective: "Understand today's chest-focus session and what success looks like.",
        professionalIntent: slot.professionalPurpose ?? "Set session intent before demonstration.",
        academyReferences: [
          ...sharedAcademy,
          ref("academy", "teaching.overview", "Session opens with movement context."),
        ],
        intelligenceReferences: [
          ref("intelligence", "programmingUseCases", "Anchor horizontal pressing day."),
        ],
        visualBeat: slot.placeholderVisualLabel ?? "Coach welcome · dark gym",
        teachingBeat: "Welcome, intent, confidence — optional coach message overlay.",
        transitionToNext: "Reveal the full movement demonstration.",
      };
    case "heroDemo":
      return {
        clientLearningObjective: "See the complete bench press pattern at working tempo.",
        professionalIntent: "Anchor the lesson with world-class demonstration footage.",
        academyReferences: [
          ...sharedAcademy,
          ref("academy", "teaching.execution", "Full rep demonstration reference."),
        ],
        intelligenceReferences: [
          ref("intelligence", "primaryMuscles", "Chest drives the press."),
          ref("intelligence", "secondaryMuscles", "Triceps and shoulders assist."),
          ref("intelligence", "movementAnalysis.plane", "Horizontal press plane."),
          ref(
            "intelligence",
            "jointConsiderations",
            "Shoulder and elbow alignment under load.",
          ),
          packageRef,
        ],
        visualBeat: "Cinematic full-body bench · bar path visible · controlled reps.",
        teachingBeat: "Show one clean rep cycle — descent, touch, drive, lockout.",
        transitionToNext: "Break down setup before the client loads the bar.",
      };
    case "setup":
      return {
        clientLearningObjective: "Find stable shoulders, grip, and foot drive before loading.",
        professionalIntent: "Reduce setup errors that compound under load.",
        academyReferences: [
          ref("academy", "teaching.setup", "Starting position and equipment."),
          ref("academy", "teaching.bracing", "Upper-back tension and bracing."),
        ],
        intelligenceReferences: [
          ref("intelligence", "stabilizers", "Scapular stabilizers and core engagement."),
          ref("intelligence", "movementAnalysis.limitingFactors", "Shoulder stability, wrist stack."),
        ],
        visualBeat: "Close setup shots — arch, grip width, bar alignment, leg drive.",
        teachingBeat: "Pin shoulders down and back; stack wrists over elbows.",
        transitionToNext: "Move into rep-by-rep execution coaching.",
      };
    case "execution":
      return {
        clientLearningObjective: "Learn rep rhythm — controlled descent, touch, strong drive.",
        professionalIntent: "Connect tempo and bar path to what the client should feel.",
        academyReferences: [
          ref("academy", "teaching.execution", "Rep-by-rep pressing guidance."),
          ref("academy", "teaching.tempo", "Eccentric and concentric control."),
          ref("academy", "teaching.coachingCues", "Primary execution cues."),
        ],
        intelligenceReferences: [
          ref("intelligence", "movementAnalysis.primeActions", "Horizontal adduction + elbow extension."),
        ],
        visualBeat: "Side and 45° angles · continuous reps · tempo visible.",
        teachingBeat: "Own the eccentric; drive through mid-range without losing bar path.",
        transitionToNext: "Contrast correct form with the most common mistake.",
      };
    case "commonMistake":
      return {
        clientLearningObjective: "Recognize elbow flare and loose upper-back setup immediately.",
        professionalIntent: "Preempt the most frequent bench press breakdown.",
        academyReferences: [
          ref("academy", "teaching.commonMistakes", "Frequent form errors to correct."),
        ],
        intelligenceReferences: [
          ref("intelligence", "jointConsiderations", "Shoulder stress when elbows flare."),
        ],
        visualBeat: "Split comparison — mistake vs correction with callout cards.",
        teachingBeat: "Show the error, name it, then show the fix in one rep.",
        transitionToNext: "Slow the movement to feel bottom position and bar path.",
      };
    case "slowMotion":
      return {
        clientLearningObjective: "Feel chest touch and bar path in slow motion.",
        professionalIntent: "Emphasize tempo when Today's Goal focuses on control.",
        academyReferences: [ref("academy", "teaching.tempo", "Pause and control at the bottom.")],
        intelligenceReferences: [
          ref("intelligence", "fatigueProfile.note", "Control reduces shoulder stress at same load."),
        ],
        visualBeat: "Slow-motion chest touch · bar path trace · 0.5× speed.",
        teachingBeat: "Highlight bottom position without bouncing the bar.",
        transitionToNext: "Layer muscle activation overlay for chest emphasis.",
      };
    case "muscleOverlay":
      return {
        clientLearningObjective: "See chest, triceps, and anterior deltoid roles during the press.",
        professionalIntent: "Support activation-focused coaching on chest emphasis days.",
        academyReferences: [
          ref("academy", "identity.primaryMuscles", "Chest as prime mover."),
          ref("academy", "identity.secondaryMuscles", "Triceps and shoulders assist."),
        ],
        intelligenceReferences: [
          ref("intelligence", "primaryMuscles", "Chest activation emphasis."),
          ref("intelligence", "secondaryMuscles", "Triceps extension contribution."),
          ref("intelligence", "stabilizers", "Scapular and core stabilization."),
        ],
        visualBeat: "Anatomy overlay on working rep — chest and triceps highlight.",
        teachingBeat: "Connect what they see to what they should feel in the pecs.",
        transitionToNext: "Prompt reflection before the client logs the set.",
      };
    case "reflection":
      return {
        clientLearningObjective: "Rate technique quality and carry one cue into the next set.",
        professionalIntent: "Close the lesson loop before session logging.",
        academyReferences: [
          ref("academy", "teaching.shouldFeel", "Positive technique sensations."),
          ref("academy", "teaching.shouldNotFeel", "Stop-if sensations."),
        ],
        intelligenceReferences: [
          ref("intelligence", "programmingUseCases", "Hypertrophy and strength fit notes."),
        ],
        visualBeat: "Calm lesson card · technique rating · one cue to remember.",
        teachingBeat: "Confidence check — one thing that went well, one thing to refine.",
        transitionToNext: baseTransition,
      };
    default:
      return {
        clientLearningObjective: slot.clientPurpose ?? slot.purpose,
        professionalIntent: slot.professionalPurpose ?? slot.purpose,
        academyReferences: sharedAcademy,
        intelligenceReferences: sharedIntel,
        visualBeat: slot.placeholderVisualLabel ?? slot.title,
        teachingBeat: slot.purpose,
        transitionToNext: baseTransition,
      };
  }
}

function buildScene(slot: MediaSlot, index: number, slots: MediaSlot[]): BenchPressStoryboardScene {
  const fields = sceneStoryboardFields(slot, index, slots);
  return {
    sceneId: `bench-press-scene-${slot.slotType}`,
    slotId: slot.slotId,
    slotType: slot.slotType,
    title: slot.title,
    purpose: slot.purpose,
    durationSeconds: slot.recommendedDurationSeconds,
    ...fields,
  };
}

/** Deterministic Bench Press media storyboard from Academy, Intelligence, and pilot package. */
export function buildBenchPressMediaStoryboard(
  input: BenchPressStoryboardInput = {},
): BenchPressMediaStoryboard {
  const mediaPackage = input.mediaPackage ?? buildBenchPressPilotMasterMediaPackage();
  const orderedSlots = BENCH_PRESS_PILOT_ENABLED_SLOTS.map((slotType) => {
    const slot = mediaPackage.slots.find((row) => row.slotType === slotType);
    if (!slot) {
      throw new Error(`Missing bench press pilot slot: ${slotType}`);
    }
    return slot;
  });

  const scenes = orderedSlots.map((slot, index) => buildScene(slot, index, orderedSlots));
  const totalDurationSeconds = scenes.reduce((sum, scene) => sum + scene.durationSeconds, 0);

  return {
    exerciseId: BENCH_PRESS_PRODUCT_EXERCISE_ID,
    productVersion: BENCH_PRESS_PRODUCT_VERSION,
    storyboardVersion: BENCH_PRESS_STORYBOARD_VERSION,
    sourceAcademyVersion: EXERCISE_ACADEMY_VERSION,
    sourceMediaPackageVersion: mediaPackage.packageVersion,
    scenes,
    totalDurationSeconds,
    createdFor: BENCH_PRESS_PRODUCT_CREATED_FOR,
  };
}

export function benchPressStoryboardSlotOrder(): MediaSlotType[] {
  return [...BENCH_PRESS_PILOT_ENABLED_SLOTS];
}
