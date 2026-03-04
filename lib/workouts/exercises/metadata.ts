/**
 * Deterministic exercise metadata: equipment, primary muscle, cues, description.
 * Offline-first; no network. Used for list subtitles and detail modal.
 */

export type MovementPattern =
  | "push"
  | "pull"
  | "squat"
  | "hinge"
  | "carry"
  | "core"
  | "isolation";

export type TrainingType =
  | "mobility"
  | "strength"
  | "power"
  | "functional"
  | "conditioning"
  | "isolation";

export type ExerciseMeta = {
  equipment: string;
  primary: string;
  movement: MovementPattern;
  trainingType: TrainingType;
  cues: string[];
  description: string;
};

const DEFAULT_META: ExerciseMeta = {
  equipment: "Other",
  primary: "Full body",
  movement: "isolation",
  trainingType: "isolation",
  cues: ["Control the movement.", "Breathe steadily."],
  description: "Exercise details.",
};

/** Deterministic metadata by exerciseId. One source of truth for catalog v1. */
const META_BY_ID: Record<string, ExerciseMeta> = {
  bench_press: {
    equipment: "Barbell",
    primary: "Chest",
    movement: "push",
    trainingType: "strength",
    cues: ["Retract shoulder blades.", "Lower to chest, drive up.", "Feet flat, slight arch."],
    description: "Lie on bench, grip bar slightly wider than shoulders. Lower to chest and press up.",
  },
  incline_bench_press: {
    equipment: "Barbell",
    primary: "Chest",
    movement: "push",
    trainingType: "strength",
    cues: ["Set bench 30–45°.", "Lower to upper chest.", "Drive through heels."],
    description: "Incline bench press targets upper chest. Grip bar, lower with control, press up.",
  },
  dumbbell_bench_press: {
    equipment: "Dumbbell",
    primary: "Chest",
    movement: "push",
    trainingType: "strength",
    cues: ["Full range of motion.", "Control the descent.", "Squeeze at top."],
    description: "Flat bench with dumbbells. Allows greater stretch and independent arm path.",
  },
  overhead_press: {
    equipment: "Barbell",
    primary: "Shoulders",
    movement: "push",
    trainingType: "strength",
    cues: ["Brace core, no lean back.", "Press in a straight line.", "Lock out overhead."],
    description: "Standing barbell press. Press from front-rack position to lockout.",
  },
  dumbbell_shoulder_press: {
    equipment: "Dumbbell",
    primary: "Shoulders",
    movement: "push",
    trainingType: "strength",
    cues: ["Start at shoulder height.", "Press up, don’t swing.", "Control the negative."],
    description: "Seated or standing dumbbell press for shoulders.",
  },
  push_up: {
    equipment: "Bodyweight",
    primary: "Chest",
    movement: "push",
    trainingType: "strength",
    cues: ["Core tight, straight line.", "Elbows ~45° from body.", "Full lockout at top."],
    description: "Bodyweight push-up. Hands shoulder-width, lower chest to floor and push back up.",
  },
  squat: {
    equipment: "Barbell",
    primary: "Legs",
    movement: "squat",
    trainingType: "strength",
    cues: ["Break at hips and knees.", "Knees track over toes.", "Drive through heels."],
    description: "Back squat with barbell. Bar on upper back, squat to depth, stand.",
  },
  front_squat: {
    equipment: "Barbell",
    primary: "Legs",
    movement: "squat",
    trainingType: "strength",
    cues: ["Elbows high, rack secure.", "Upright torso.", "Knees forward, heels down."],
    description: "Front squat with bar in front-rack position. Emphasizes quads and core.",
  },
  deadlift: {
    equipment: "Barbell",
    primary: "Back",
    movement: "hinge",
    trainingType: "strength",
    cues: ["Hinge at hips.", "Bar close to legs.", "Lock out hips and knees."],
    description: "Conventional deadlift. Hinge down, grip bar, drive up to standing.",
  },
  romanian_deadlift: {
    equipment: "Barbell",
    primary: "Back",
    movement: "hinge",
    trainingType: "strength",
    cues: ["Slight knee bend.", "Push hips back.", "Feel hamstring stretch."],
    description: "RDL: hinge at hips with slight knee bend, stretch hamstrings, return.",
  },
  hip_thrust: {
    equipment: "Barbell",
    primary: "Legs",
    movement: "hinge",
    trainingType: "strength",
    cues: ["Upper back on bench.", "Drive through heels.", "Squeeze glutes at top."],
    description: "Barbell across hips, upper back on bench, thrust up to lockout.",
  },
  leg_press: {
    equipment: "Machine",
    primary: "Legs",
    movement: "squat",
    trainingType: "strength",
    cues: ["Feet shoulder-width.", "Don’t lock knees.", "Full range, controlled."],
    description: "Seated leg press. Push platform away, lower with control.",
  },
  leg_extension: {
    equipment: "Machine",
    primary: "Legs",
    movement: "isolation",
    trainingType: "isolation",
    cues: ["Adjust pad for ankle.", "Extend without swinging.", "Squeeze at top."],
    description: "Machine quad isolation. Extend legs against pad from 90° to straight.",
  },
  leg_curl: {
    equipment: "Machine",
    primary: "Legs",
    movement: "hinge",
    trainingType: "isolation",
    cues: ["Curl without lifting hips.", "Control the negative.", "Full range."],
    description: "Lying or seated leg curl for hamstrings.",
  },
  calf_raise: {
    equipment: "Machine",
    primary: "Legs",
    movement: "isolation",
    trainingType: "isolation",
    cues: ["Full stretch at bottom.", "Rise onto toes.", "Control the lower."],
    description: "Standing or seated calf raise. Rise onto toes, lower with stretch.",
  },
  pull_up: {
    equipment: "Bodyweight",
    primary: "Back",
    movement: "pull",
    trainingType: "strength",
    cues: ["Full hang to chin over bar.", "No kip.", "Control descent."],
    description: "Hang from bar, pull until chin over bar, lower with control.",
  },
  lat_pulldown: {
    equipment: "Machine",
    primary: "Back",
    movement: "pull",
    trainingType: "strength",
    cues: ["Pull to upper chest.", "Squeeze shoulder blades.", "Don’t lean back excessively."],
    description: "Cable or machine pulldown. Pull bar to upper chest, squeeze, return.",
  },
  barbell_row: {
    equipment: "Barbell",
    primary: "Back",
    movement: "pull",
    trainingType: "strength",
    cues: ["Hinge, back flat.", "Pull to lower chest/upper abs.", "Squeeze at top."],
    description: "Bent-over barbell row. Hinge at hips, pull bar to torso.",
  },
  dumbbell_row: {
    equipment: "Dumbbell",
    primary: "Back",
    movement: "pull",
    trainingType: "strength",
    cues: ["Support on bench or knee.", "Pull elbow back.", "Squeeze shoulder blade."],
    description: "Single-arm dumbbell row. Support body, row dumbbell to hip.",
  },
  seated_cable_row: {
    equipment: "Machine",
    primary: "Back",
    movement: "pull",
    trainingType: "strength",
    cues: ["Chest up, core braced.", "Pull to lower chest.", "Squeeze and return."],
    description: "Seated cable row. Pull handle to torso, squeeze back, return.",
  },
  face_pull: {
    equipment: "Machine",
    primary: "Back",
    movement: "pull",
    trainingType: "strength",
    cues: ["Pull to face level.", "External rotation at end.", "Squeeze rear delts."],
    description: "Cable face pull. Pull rope to face, externally rotate, squeeze.",
  },
  bicep_curl: {
    equipment: "Barbell",
    primary: "Biceps",
    movement: "pull",
    trainingType: "isolation",
    cues: ["Elbows at sides.", "Full extension and curl.", "No swing."],
    description: "Barbell or dumbbell bicep curl. Curl weight to shoulders, lower.",
  },
  hammer_curl: {
    equipment: "Dumbbell",
    primary: "Biceps",
    movement: "pull",
    trainingType: "isolation",
    cues: ["Neutral grip (thumbs up).", "Curl to shoulder.", "Control both arms."],
    description: "Dumbbell hammer curl. Neutral grip, curl to shoulder.",
  },
  tricep_pushdown: {
    equipment: "Machine",
    primary: "Triceps",
    movement: "isolation",
    trainingType: "isolation",
    cues: ["Elbows at sides.", "Push to full extension.", "Control the return."],
    description: "Cable tricep pushdown. Push bar or rope down, extend elbows.",
  },
  skull_crusher: {
    equipment: "Barbell",
    primary: "Triceps",
    movement: "isolation",
    trainingType: "isolation",
    cues: ["Lower to forehead/skull.", "Elbows stay fixed.", "Extend fully."],
    description: "Lying tricep extension. Lower bar toward forehead, extend up.",
  },
  dip: {
    equipment: "Bodyweight",
    primary: "Triceps",
    movement: "push",
    trainingType: "strength",
    cues: ["Upright for triceps.", "Full depth, controlled.", "Lock out at top."],
    description: "Parallel bar or bench dip. Lower until upper arms parallel, press up.",
  },
  lateral_raise: {
    equipment: "Dumbbell",
    primary: "Shoulders",
    movement: "isolation",
    trainingType: "isolation",
    cues: ["Slight bend in elbows.", "Raise to shoulder height.", "Control the lower."],
    description: "Dumbbell lateral raise. Raise arms to sides to shoulder height.",
  },
  rear_delt_fly: {
    equipment: "Dumbbell",
    primary: "Shoulders",
    movement: "pull",
    trainingType: "isolation",
    cues: ["Hinge or bent over.", "Raise to sides.", "Squeeze rear delts."],
    description: "Rear delt fly. Hinge at hips, raise dumbbells to sides.",
  },
  plank: {
    equipment: "Bodyweight",
    primary: "Core",
    movement: "core",
    trainingType: "functional",
    cues: ["Straight line head to heels.", "Brace core.", "Don’t sag or pike."],
    description: "Hold push-up position with arms straight or on forearms.",
  },
  hanging_leg_raise: {
    equipment: "Bodyweight",
    primary: "Core",
    movement: "core",
    trainingType: "functional",
    cues: ["Hang from bar.", "Raise legs with control.", "Avoid swing."],
    description: "Hang from bar, raise legs to horizontal or higher, lower with control.",
  },
};

/**
 * Returns deterministic metadata for an exercise. Unknown ids get a safe default.
 */
export function getExerciseMeta(exerciseId: string): ExerciseMeta {
  return META_BY_ID[exerciseId] ?? DEFAULT_META;
}
