// lib/data/program/buildWorkoutBuilderModel.ts
/**
 * Pure, deterministic builders for the Workout Builder v1.
 *
 * - buildDefaultWorkoutProgramDraft(): a typed local seed program (Programming-PDF style split).
 * - buildWorkoutBuilderModel(draft): derives day summaries, the exercise preview, and the
 *   review summary from a draft.
 *
 * No IO, no Firebase/API, no hidden date/time. The draft is local-only authoring intent;
 * nothing is persisted (Save is disabled — persistence is not approved).
 */
import {
  PROGRAM_MUSCLE_TARGET_LABEL,
  WORKOUT_TRAINING_DAY_TYPE_LABEL,
  type MuscleVolumeTarget,
  type WorkoutBuilderModel,
  type WorkoutDayDraft,
  type WorkoutDaySummary,
  type WorkoutExercisePrescription,
  type WorkoutProgramDraft,
  type WorkoutReviewSummary,
  type WorkoutScheduleDay,
} from "@/lib/data/program/workoutBuilderTypes";

/** Exercises surfaced (in order) by the Exercise Prescription Preview card. */
export const WORKOUT_PREVIEW_EXERCISE_IDS: readonly string[] = [
  "ex_incline_db_press",
  "ex_chest_supported_row",
  "ex_safety_bar_squat",
  "ex_bench_press",
  "ex_hack_squat",
] as const;

const SCHEDULE_SEED: readonly WorkoutScheduleDay[] = [
  { weekday: "Sunday", type: "upper", sessionName: "Upper A" },
  { weekday: "Monday", type: "lower", sessionName: "Lower A" },
  { weekday: "Tuesday", type: "cardio", sessionName: "Cardio" },
  { weekday: "Wednesday", type: "upper", sessionName: "Upper B" },
  { weekday: "Thursday", type: "cardio", sessionName: "Cardio" },
  { weekday: "Friday", type: "lower", sessionName: "Lower B" },
  { weekday: "Saturday", type: "full_body", sessionName: "Full Body + VO₂" },
] as const;

const VOLUME_TARGET_SEED: readonly { muscle: MuscleVolumeTarget["muscle"]; sets: number }[] = [
  { muscle: "chest", sets: 14 },
  { muscle: "back", sets: 16 },
  { muscle: "side_delts", sets: 12 },
  { muscle: "rear_delts", sets: 10 },
  { muscle: "front_delts", sets: 6 },
  { muscle: "biceps", sets: 10 },
  { muscle: "triceps", sets: 10 },
  { muscle: "quads", sets: 14 },
  { muscle: "hamstrings", sets: 12 },
  { muscle: "glutes", sets: 12 },
  { muscle: "calves", sets: 10 },
  { muscle: "core", sets: 8 },
];

function ex(
  id: string,
  name: string,
  sets: number,
  reps: string,
  tempo: string,
  restSeconds: number,
  rir: number,
  loadTarget: string | null,
): WorkoutExercisePrescription {
  return { id, name, sets, reps, tempo, restSeconds, rir, loadTarget };
}

const DAYS_SEED: readonly WorkoutDayDraft[] = [
  {
    id: "day_upper_a",
    weekday: "Sunday",
    sessionName: "Upper A",
    type: "upper",
    exercises: [
      ex("ex_incline_db_press", "Incline DB Press", 4, "8–10", "3-1-1", 150, 2, "~72% 1RM"),
      ex("ex_chest_supported_row", "Chest Supported Row", 4, "8–12", "2-1-1", 120, 2, "RPE 8"),
      ex("ex_lateral_raise", "Cable Lateral Raise", 3, "12–15", "2-0-1", 75, 1, "RPE 9"),
      ex("ex_triceps_pushdown", "Triceps Pushdown", 3, "10–12", "2-0-1", 75, 1, "RPE 9"),
    ],
  },
  {
    id: "day_lower_a",
    weekday: "Monday",
    sessionName: "Lower A",
    type: "lower",
    exercises: [
      ex("ex_safety_bar_squat", "Safety Bar Squat", 4, "6–8", "3-1-0", 180, 2, "~78% 1RM"),
      ex("ex_romanian_deadlift", "Romanian Deadlift", 3, "8–10", "3-1-0", 150, 2, "RPE 8"),
      ex("ex_leg_curl", "Seated Leg Curl", 3, "10–12", "2-1-1", 90, 1, "RPE 9"),
      ex("ex_calf_raise", "Standing Calf Raise", 4, "10–15", "2-1-2", 75, 1, "RPE 9"),
    ],
  },
  {
    id: "day_upper_b",
    weekday: "Wednesday",
    sessionName: "Upper B",
    type: "upper",
    exercises: [
      ex("ex_bench_press", "Bench Press", 4, "5–8", "3-1-0", 180, 2, "~80% 1RM"),
      ex("ex_pull_up", "Weighted Pull-Up", 4, "6–10", "2-1-1", 150, 2, "BWR + 0.1"),
      ex("ex_cable_fly", "Cable Fly", 3, "12–15", "2-0-1", 75, 1, "RPE 9"),
      ex("ex_incline_curl", "Incline DB Curl", 3, "10–12", "2-0-1", 75, 1, "RPE 9"),
    ],
  },
  {
    id: "day_lower_b",
    weekday: "Friday",
    sessionName: "Lower B",
    type: "lower",
    exercises: [
      ex("ex_hack_squat", "Hack Squat", 4, "8–12", "3-1-1", 150, 2, "RPE 8"),
      ex("ex_hip_thrust", "Hip Thrust", 3, "8–10", "2-1-1", 120, 2, "RPE 8"),
      ex("ex_leg_extension", "Leg Extension", 3, "12–15", "2-1-1", 90, 1, "RPE 9"),
      ex("ex_seated_calf_raise", "Seated Calf Raise", 4, "12–15", "2-1-2", 75, 1, "RPE 9"),
    ],
  },
  {
    id: "day_full_body",
    weekday: "Saturday",
    sessionName: "Full Body + VO₂",
    type: "full_body",
    exercises: [
      ex("ex_trap_bar_deadlift", "Trap Bar Deadlift", 3, "5", "2-1-1", 180, 2, "~80% 1RM"),
      ex("ex_overhead_press", "Overhead Press", 3, "6–8", "2-1-1", 150, 2, "RPE 8"),
      ex("ex_lat_pulldown", "Lat Pulldown", 3, "10–12", "2-1-1", 90, 1, "RPE 9"),
    ],
  },
];

/** Build the deterministic default workout program draft (typed local seed; not persisted). */
export function buildDefaultWorkoutProgramDraft(): WorkoutProgramDraft {
  return {
    setup: {
      name: "Hybrid Hypertrophy 7-Day",
      goal: "Build muscle with weekly cardio + recovery",
      trainingLevel: "intermediate",
      durationWeeks: 8,
      notes: "Upper/Lower split with two Zone-2 cardio days and a Saturday VO₂ finisher.",
    },
    schedule: SCHEDULE_SEED.map((d) => ({ ...d })),
    volumeTargets: VOLUME_TARGET_SEED.map((t) => ({
      muscle: t.muscle,
      label: PROGRAM_MUSCLE_TARGET_LABEL[t.muscle],
      targetSetsPerWeek: t.sets,
    })),
    days: DAYS_SEED.map((d) => ({ ...d, exercises: d.exercises.map((e) => ({ ...e })) })),
  };
}

function sumSets(exercises: readonly WorkoutExercisePrescription[]): number {
  return exercises.reduce((total, e) => total + e.sets, 0);
}

function buildDaySummary(day: WorkoutDayDraft): WorkoutDaySummary {
  return {
    id: day.id,
    weekday: day.weekday,
    sessionName: day.sessionName,
    focusLabel: WORKOUT_TRAINING_DAY_TYPE_LABEL[day.type],
    exerciseCount: day.exercises.length,
    estimatedSets: sumSets(day.exercises),
    editable: false,
  };
}

function buildReviewSummary(draft: WorkoutProgramDraft): WorkoutReviewSummary {
  const cardioSessions = draft.schedule.filter((d) => d.type === "cardio").length;
  const recoveryRestDays = draft.schedule.filter(
    (d) => d.type === "recovery" || d.type === "rest",
  ).length;
  const weeklySets = draft.days.reduce((total, day) => total + sumSets(day.exercises), 0);

  return {
    trainingDays: draft.days.length,
    weeklySets,
    cardioSessions,
    recoveryRestDays,
    saveEnabled: false,
    saveHint: "Saving is coming soon",
  };
}

function buildExercisePreview(draft: WorkoutProgramDraft): WorkoutExercisePrescription[] {
  const byId = new Map<string, WorkoutExercisePrescription>();
  for (const day of draft.days) {
    for (const exercise of day.exercises) {
      if (!byId.has(exercise.id)) byId.set(exercise.id, exercise);
    }
  }
  const preview: WorkoutExercisePrescription[] = [];
  for (const id of WORKOUT_PREVIEW_EXERCISE_IDS) {
    const found = byId.get(id);
    if (found) preview.push({ ...found });
  }
  return preview;
}

/** Derive the full Workout Builder view-model from a draft. Deterministic. */
export function buildWorkoutBuilderModel(draft: WorkoutProgramDraft): WorkoutBuilderModel {
  return {
    draft,
    daySummaries: draft.days.map(buildDaySummary),
    exercisePreview: buildExercisePreview(draft),
    review: buildReviewSummary(draft),
  };
}
