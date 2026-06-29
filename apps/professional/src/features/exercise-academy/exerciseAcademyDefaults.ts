import type { WorkoutLibraryExercise } from "../workout-studio/exerciseLibraryAdapter";
import type { ExerciseSkillLevel, ExerciseTeaching } from "./types";

export function inferSkillLevel(trainingType: string): ExerciseSkillLevel {
  if (trainingType === "mobility" || trainingType === "cardio") return "beginner";
  if (trainingType === "strength") return "intermediate";
  return "intermediate";
}

export function patternJointActions(movementPattern: string | null): string[] {
  switch (movementPattern) {
    case "push":
      return ["Shoulder flexion", "Elbow extension"];
    case "pull":
      return ["Shoulder extension", "Elbow flexion", "Scapular retraction"];
    case "squat":
      return ["Hip flexion", "Knee flexion", "Ankle dorsiflexion"];
    case "hinge":
      return ["Hip flexion/extension", "Spinal stabilization"];
    case "lunge":
      return ["Hip flexion", "Knee flexion", "Single-leg stability"];
    case "core":
      return ["Trunk stabilization", "Anti-extension or anti-rotation"];
    case "carry":
      return ["Hip stability", "Trunk bracing"];
    default:
      return ["Controlled joint movement through available range"];
  }
}

export function patternCues(movementPattern: string | null, libraryCues: string[]): string[] {
  const fromLibrary = libraryCues.map((text) => text.trim()).filter(Boolean).slice(0, 4);
  if (fromLibrary.length > 0) return fromLibrary;

  switch (movementPattern) {
    case "push":
      return [
        "Brace your core before each rep.",
        "Keep wrists stacked over elbows.",
        "Control the lowering phase.",
      ];
    case "pull":
      return [
        "Initiate with the back, not the arms.",
        "Keep shoulders down and away from ears.",
        "Pull elbows toward your sides.",
      ];
    case "squat":
    case "hinge":
      return [
        "Spread the floor with your feet.",
        "Keep ribs stacked over pelvis.",
        "Move through a controlled range you own.",
      ];
    case "carry":
      return ["Stay tall through the torso.", "Walk with even, controlled steps."];
    case "core":
      return ["Breathe steadily without losing brace.", "Move slowly through the range."];
    default:
      return [
        "Set up with control before moving.",
        "Use a tempo you can repeat with good form.",
      ];
  }
}

export function genericMistakes(): string[] {
  return [
    "Rushing reps and losing position.",
    "Using load that compromises technique.",
    "Holding breath or bracing inconsistently.",
  ];
}

export function genericShouldNotFeel(): string[] {
  return ["Sharp joint pain", "Pinching", "Compensating through unrelated areas"];
}

export function buildTeachingFromLibrary(exercise: WorkoutLibraryExercise): ExerciseTeaching {
  const muscles =
    exercise.primaryMuscles.length > 0
      ? exercise.primaryMuscles.join(", ")
      : "target muscles";
  const pattern = exercise.movementPattern || "movement";
  const equipment = exercise.equipment || "available equipment";

  const overview =
    exercise.description?.trim() ||
    `${exercise.name} trains ${muscles} using a ${pattern} pattern with ${equipment}.`;

  return {
    overview,
    setup: `Set up ${exercise.name} with ${equipment}. Choose a load and position that allow clean technique from the first rep.`,
    execution: `Move through the intended range of motion with consistent tempo and control. Keep tension on ${muscles}.`,
    coachingCues: patternCues(exercise.movementPattern, exercise.cues),
    commonMistakes: genericMistakes(),
    shouldFeel: exercise.primaryMuscles.length > 0 ? [...exercise.primaryMuscles] : [muscles],
    shouldNotFeel: genericShouldNotFeel(),
    breathing: "Exhale through the effort phase; inhale during the return or setup reset.",
    tempo: "Controlled eccentric, brief pause if needed, smooth concentric.",
    bracing: "Create full-body tension before moving. Maintain rib and pelvis alignment.",
    beginnerNotes: "Start with lighter load and fewer sets until the pattern feels repeatable.",
    advancedNotes: "Refine tempo, intent, and load only when technique stays consistent across all sets.",
  };
}

export function buildBiomechanicsFromLibrary(exercise: WorkoutLibraryExercise) {
  const pattern = exercise.movementPattern || "general";
  return {
    primaryJointActions: patternJointActions(exercise.movementPattern),
    movementPath: `${pattern} pattern emphasizing ${exercise.primaryMuscles.join(", ") || "primary muscles"}`,
    rangeOfMotion: "Use a range you can control without compensation.",
    stabilityDemand:
      exercise.equipment === "Bodyweight" ? "Moderate to high body control" : "Moderate",
    fatigueCost: exercise.trainingType === "strength" ? "Moderate" : "Low to moderate",
    recoveryCost: exercise.primaryMuscles.length > 1 ? "Moderate" : "Low to moderate",
  };
}

export function buildProgrammingFromLibrary(exercise: WorkoutLibraryExercise) {
  return {
    bestUsedFor: [
      `Developing ${exercise.primaryMuscles.join(", ") || "target muscles"}`,
      `${exercise.trainingType} training sessions`,
    ],
    loadingPatterns: ["Straight sets", "Progressive overload when technique is consistent"],
    repRanges: ["6-8 strength", "8-12 hypertrophy", "12-15 endurance"],
    tempoOptions: ["3-1-1 controlled", "2-0-2 moderate", "Explosive concentric when prescribed"],
    progressionOptions: [
      "If all prescribed reps are completed with target RPE/RIR and clean technique, progress load next exposure.",
    ],
    regressionOptions: [],
    substitutionOptions: [],
    contraindicationNotes:
      "Scale load and range if discomfort appears. Stop if sharp pain or loss of control occurs.",
    programmingNotes: `Pair with complementary ${exercise.movementPattern || "movement"} work across the week.`,
  };
}
