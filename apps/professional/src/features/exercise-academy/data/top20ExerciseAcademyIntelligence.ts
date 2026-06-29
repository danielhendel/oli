import type {
  ExerciseAcademyIntelligenceEntry,
  FatigueProfile,
  JointConsideration,
  MovementAnalysis,
  ProgrammingUseCase,
} from "../exerciseAcademyIntelligenceTypes";
import { EXERCISE_ACADEMY_INTELLIGENCE_VERSION } from "../exerciseAcademyIntelligenceTypes";

type IntelligenceSeedInput = {
  exerciseId: string;
  primaryMuscles: string[];
  secondaryMuscles: string[];
  stabilizers: string[];
  jointConsiderations: JointConsideration[];
  movementAnalysis: MovementAnalysis;
  programmingUseCases: ProgrammingUseCase[];
  fatigueProfile: FatigueProfile;
  coachingDecisionNotes: string;
  regressionOptions: string[];
  substitutionOptions: string[];
};

export function buildIntelligenceEntry(input: IntelligenceSeedInput): ExerciseAcademyIntelligenceEntry {
  return {
    exerciseId: input.exerciseId,
    academyVersion: EXERCISE_ACADEMY_INTELLIGENCE_VERSION,
    reviewStatus: "draft",
    evidenceLevel: "expert-consensus",
    primaryMuscles: input.primaryMuscles,
    secondaryMuscles: input.secondaryMuscles,
    stabilizers: input.stabilizers,
    jointConsiderations: input.jointConsiderations,
    movementAnalysis: input.movementAnalysis,
    programmingUseCases: input.programmingUseCases,
    fatigueProfile: input.fatigueProfile,
    coachingDecisionNotes: input.coachingDecisionNotes,
    substitutions: {
      regressionOptions: input.regressionOptions,
      substitutionOptions: input.substitutionOptions,
    },
    reviewNotes: "Draft expert-consensus seed for Workout Studio designer education.",
  };
}

const pushJoints: JointConsideration[] = [
  { joint: "shoulder", stressLevel: "moderate", note: "Monitor shoulder position under load; scale range if discomfort." },
  { joint: "elbow", stressLevel: "low", note: "Elbow flexion/extension should stay pain-free through full reps." },
];

const pullJoints: JointConsideration[] = [
  { joint: "shoulder", stressLevel: "moderate", note: "Scapular control matters for shoulder-friendly pulling." },
  { joint: "elbow", stressLevel: "low", note: "Avoid excessive elbow flare or compensatory wrist strain." },
];

const squatJoints: JointConsideration[] = [
  { joint: "knee", stressLevel: "moderate", note: "Track knees over toes; scale depth to owned range." },
  { joint: "hip", stressLevel: "moderate", note: "Hip mobility and bracing affect squat quality." },
  { joint: "spine", stressLevel: "moderate", note: "Maintain rib-pelvis stack; reduce load if form breaks down." },
];

const hingeJoints: JointConsideration[] = [
  { joint: "hip", stressLevel: "moderate", note: "Hip hinge pattern should dominate; avoid turning it into a squat." },
  { joint: "spine", stressLevel: "moderate", note: "Neutral spine under load; stop if lumbar rounding increases." },
  { joint: "knee", stressLevel: "low", note: "Soft knee bend is normal; avoid excessive knee travel." },
];

/** Top 20 high-value canonical exercises — validated against EXERCISE_LIBRARY_V1 at test time. */
export const TOP20_EXERCISE_ACADEMY_INTELLIGENCE: ExerciseAcademyIntelligenceEntry[] = [
  buildIntelligenceEntry({
    exerciseId: "bench_press",
    primaryMuscles: ["Chest"],
    secondaryMuscles: ["Triceps", "Shoulders"],
    stabilizers: ["Scapular stabilizers", "Core", "Forearm grip"],
    jointConsiderations: pushJoints,
    movementAnalysis: {
      pattern: "push",
      plane: "transverse / horizontal",
      primeActions: ["Shoulder horizontal adduction", "Elbow extension"],
      limitingFactors: ["Shoulder stability", "Wrist stack", "Leg drive consistency"],
      stabilityDemand: "moderate",
    },
    programmingUseCases: [
      { goal: "strength", fit: "primary", note: "Anchor horizontal pressing day." },
      { goal: "hypertrophy", fit: "primary", note: "High chest volume with controlled tempo." },
      { goal: "general-fitness", fit: "secondary", note: "Use submax loads for technique practice." },
    ],
    fatigueProfile: {
      localFatigue: "moderate",
      systemicFatigue: "moderate",
      recoveryCost: "moderate",
      note: "Triceps and anterior shoulder share load — watch cumulative pressing volume.",
    },
    coachingDecisionNotes: "Choose when you need a heavy horizontal press anchor with clear loading progressions.",
    regressionOptions: ["Dumbbell bench press", "Push-up progression"],
    substitutionOptions: ["Dumbbell bench press", "Incline bench press", "Machine chest press"],
  }),
  buildIntelligenceEntry({
    exerciseId: "incline_bench_press",
    primaryMuscles: ["Chest"],
    secondaryMuscles: ["Shoulders", "Triceps"],
    stabilizers: ["Scapular stabilizers", "Core"],
    jointConsiderations: [
      { joint: "shoulder", stressLevel: "moderate", note: "Incline angle increases anterior shoulder demand." },
      { joint: "elbow", stressLevel: "low", note: "Keep elbows stacked; avoid flaring excessively." },
    ],
    movementAnalysis: {
      pattern: "push",
      plane: "incline horizontal",
      primeActions: ["Shoulder flexion/adduction", "Elbow extension"],
      limitingFactors: ["Upper chest activation", "Shoulder comfort at angle"],
      stabilityDemand: "moderate",
    },
    programmingUseCases: [
      { goal: "hypertrophy", fit: "primary", note: "Upper chest emphasis within push sessions." },
      { goal: "strength", fit: "secondary", note: "Accessory to flat bench or OHP day." },
    ],
    fatigueProfile: {
      localFatigue: "moderate",
      systemicFatigue: "low",
      recoveryCost: "moderate",
      note: "Pairs well before heavier flat pressing if shoulder recovery is limited.",
    },
    coachingDecisionNotes: "Use to bias upper chest without replacing flat bench entirely.",
    regressionOptions: ["Low-incline dumbbell press"],
    substitutionOptions: ["Dumbbell incline press", "Machine incline press"],
  }),
  buildIntelligenceEntry({
    exerciseId: "dumbbell_bench_press",
    primaryMuscles: ["Chest"],
    secondaryMuscles: ["Triceps", "Shoulders"],
    stabilizers: ["Scapular stabilizers", "Core", "Forearm stabilizers"],
    jointConsiderations: pushJoints,
    movementAnalysis: {
      pattern: "push",
      plane: "horizontal",
      primeActions: ["Shoulder horizontal adduction", "Elbow extension"],
      limitingFactors: ["Independent arm stability", "Range at bottom"],
      stabilityDemand: "high",
    },
    programmingUseCases: [
      { goal: "hypertrophy", fit: "primary", note: "Longer ROM and unilateral stability challenge." },
      { goal: "rehab-prehab", fit: "secondary", note: "Lower absolute load with natural arm path." },
    ],
    fatigueProfile: {
      localFatigue: "moderate",
      systemicFatigue: "low",
      recoveryCost: "moderate",
      note: "Stabilizer demand is higher than barbell bench at same RPE.",
    },
    coachingDecisionNotes: "Strong choice when joint-friendly paths or unilateral balance matter.",
    regressionOptions: ["Floor press", "Push-up"],
    substitutionOptions: ["Bench press", "Machine chest press"],
  }),
  buildIntelligenceEntry({
    exerciseId: "overhead_press",
    primaryMuscles: ["Shoulders"],
    secondaryMuscles: ["Triceps", "Core"],
    stabilizers: ["Scapular stabilizers", "Glutes", "Core"],
    jointConsiderations: [
      { joint: "shoulder", stressLevel: "moderate", note: "Full overhead path requires shoulder mobility and rib control." },
      { joint: "spine", stressLevel: "moderate", note: "Avoid excessive lumbar extension when fatigued." },
      { joint: "wrist", stressLevel: "low", note: "Stack wrists over elbows." },
    ],
    movementAnalysis: {
      pattern: "push",
      plane: "vertical",
      primeActions: ["Shoulder flexion", "Elbow extension"],
      limitingFactors: ["Overhead mobility", "Core bracing", "Lockout triceps contribution"],
      stabilityDemand: "high",
    },
    programmingUseCases: [
      { goal: "strength", fit: "primary", note: "Main vertical press for upper-body strength days." },
      { goal: "skill", fit: "secondary", note: "Technique work at submax loads." },
    ],
    fatigueProfile: {
      localFatigue: "moderate",
      systemicFatigue: "moderate",
      recoveryCost: "moderate",
      note: "Systemic demand rises with heavy sets near failure.",
    },
    coachingDecisionNotes: "Select for vertical pressing strength; pair with pulling volume balance.",
    regressionOptions: ["Seated dumbbell press", "Landmine press"],
    substitutionOptions: ["Dumbbell shoulder press", "Push press"],
  }),
  buildIntelligenceEntry({
    exerciseId: "dumbbell_shoulder_press",
    primaryMuscles: ["Shoulders"],
    secondaryMuscles: ["Triceps", "Core"],
    stabilizers: ["Scapular stabilizers", "Core"],
    jointConsiderations: [
      { joint: "shoulder", stressLevel: "moderate", note: "Natural arm path can reduce shoulder pinch vs fixed bar path." },
      { joint: "elbow", stressLevel: "low", note: "Control lowering phase." },
    ],
    movementAnalysis: {
      pattern: "push",
      plane: "vertical",
      primeActions: ["Shoulder flexion/abduction", "Elbow extension"],
      limitingFactors: ["Independent arm stability", "Core anti-extension"],
      stabilityDemand: "high",
    },
    programmingUseCases: [
      { goal: "hypertrophy", fit: "primary", note: "Shoulder volume with adjustable paths." },
      { goal: "general-fitness", fit: "primary", note: "Accessible vertical press option." },
    ],
    fatigueProfile: {
      localFatigue: "moderate",
      systemicFatigue: "low",
      recoveryCost: "moderate",
      note: "Moderate local shoulder fatigue; easier to autoregulate per arm.",
    },
    coachingDecisionNotes: "Flexible vertical press when bar path or shoulder comfort is a concern.",
    regressionOptions: ["Single-arm press", "Seated supported press"],
    substitutionOptions: ["Overhead press", "Machine shoulder press"],
  }),
  buildIntelligenceEntry({
    exerciseId: "pull_up",
    primaryMuscles: ["Back"],
    secondaryMuscles: ["Biceps"],
    stabilizers: ["Scapular stabilizers", "Core", "Forearm grip"],
    jointConsiderations: pullJoints,
    movementAnalysis: {
      pattern: "pull",
      plane: "vertical",
      primeActions: ["Shoulder extension/adduction", "Elbow flexion"],
      limitingFactors: ["Grip endurance", "Scapular initiation", "Body mass"],
      stabilityDemand: "high",
    },
    programmingUseCases: [
      { goal: "strength", fit: "primary", note: "Bodyweight vertical pull benchmark." },
      { goal: "hypertrophy", fit: "secondary", note: "Use added reps or load when technique is solid." },
    ],
    fatigueProfile: {
      localFatigue: "moderate",
      systemicFatigue: "moderate",
      recoveryCost: "moderate",
      note: "Grip and lat fatigue can limit subsequent pulling work.",
    },
    coachingDecisionNotes: "Best when you want vertical pulling without equipment dependency.",
    regressionOptions: ["Lat pulldown", "Band-assisted pull-up"],
    substitutionOptions: ["Lat pulldown", "Chin-up"],
  }),
  buildIntelligenceEntry({
    exerciseId: "lat_pulldown",
    primaryMuscles: ["Back"],
    secondaryMuscles: ["Biceps"],
    stabilizers: ["Scapular stabilizers", "Core"],
    jointConsiderations: pullJoints,
    movementAnalysis: {
      pattern: "pull",
      plane: "vertical",
      primeActions: ["Shoulder extension/adduction", "Elbow flexion"],
      limitingFactors: ["Lat initiation vs arm-dominance", "Torso lean"],
      stabilityDemand: "moderate",
    },
    programmingUseCases: [
      { goal: "hypertrophy", fit: "primary", note: "Scalable vertical pull volume." },
      { goal: "general-fitness", fit: "primary", note: "Accessible alternative to pull-ups." },
    ],
    fatigueProfile: {
      localFatigue: "moderate",
      systemicFatigue: "low",
      recoveryCost: "low",
      note: "Easier to recover from than heavy pull-up sets for most clients.",
    },
    coachingDecisionNotes: "Use to build lat volume and teach scapular pulling before pull-ups.",
    regressionOptions: ["Single-arm pulldown", "Band pulldown"],
    substitutionOptions: ["Pull-up", "Straight-arm pulldown"],
  }),
  buildIntelligenceEntry({
    exerciseId: "barbell_row",
    primaryMuscles: ["Back"],
    secondaryMuscles: ["Biceps", "Rear delts"],
    stabilizers: ["Spinal erectors", "Core", "Grip"],
    jointConsiderations: [
      ...pullJoints,
      { joint: "spine", stressLevel: "moderate", note: "Hip hinge position loads lumbar stabilizers." },
    ],
    movementAnalysis: {
      pattern: "pull",
      plane: "horizontal",
      primeActions: ["Scapular retraction", "Elbow flexion"],
      limitingFactors: ["Lower back endurance", "Hip hinge position", "Grip"],
      stabilityDemand: "high",
    },
    programmingUseCases: [
      { goal: "strength", fit: "primary", note: "Heavy horizontal pull for back thickness." },
      { goal: "hypertrophy", fit: "primary", note: "Mid-back and lat development." },
    ],
    fatigueProfile: {
      localFatigue: "moderate",
      systemicFatigue: "moderate",
      recoveryCost: "moderate",
      note: "Spinal erector fatigue can affect subsequent hinge work.",
    },
    coachingDecisionNotes: "Anchor horizontal pulling when load progression is the goal.",
    regressionOptions: ["Chest-supported row", "Dumbbell row"],
    substitutionOptions: ["Seated cable row", "T-bar row"],
  }),
  buildIntelligenceEntry({
    exerciseId: "seated_cable_row",
    primaryMuscles: ["Back"],
    secondaryMuscles: ["Biceps", "Rear delts"],
    stabilizers: ["Scapular stabilizers", "Core"],
    jointConsiderations: pullJoints,
    movementAnalysis: {
      pattern: "pull",
      plane: "horizontal",
      primeActions: ["Scapular retraction", "Elbow flexion"],
      limitingFactors: ["Torso stability", "Row path consistency"],
      stabilityDemand: "moderate",
    },
    programmingUseCases: [
      { goal: "hypertrophy", fit: "primary", note: "Controlled time under tension for mid-back." },
      { goal: "rehab-prehab", fit: "secondary", note: "Supported torso reduces spinal load vs bent row." },
    ],
    fatigueProfile: {
      localFatigue: "moderate",
      systemicFatigue: "low",
      recoveryCost: "low",
      note: "Lower systemic cost than heavy barbell rows.",
    },
    coachingDecisionNotes: "Good when you want horizontal pull volume with less spinal demand.",
    regressionOptions: ["Chest-supported machine row"],
    substitutionOptions: ["Barbell row", "Dumbbell row"],
  }),
  buildIntelligenceEntry({
    exerciseId: "squat",
    primaryMuscles: ["Quads", "Glutes"],
    secondaryMuscles: ["Hamstrings", "Core"],
    stabilizers: ["Core", "Spinal erectors", "Glute med"],
    jointConsiderations: squatJoints,
    movementAnalysis: {
      pattern: "squat",
      plane: "sagittal",
      primeActions: ["Knee extension", "Hip extension"],
      limitingFactors: ["Ankle mobility", "Bracing", "Depth control"],
      stabilityDemand: "high",
    },
    programmingUseCases: [
      { goal: "strength", fit: "primary", note: "Primary lower-body strength lift." },
      { goal: "hypertrophy", fit: "primary", note: "High quad/glute volume driver." },
    ],
    fatigueProfile: {
      localFatigue: "high",
      systemicFatigue: "high",
      recoveryCost: "high",
      note: "High CNS and systemic cost when trained heavy.",
    },
    coachingDecisionNotes: "Default lower-body anchor when bilateral strength is the session goal.",
    regressionOptions: ["Goblet squat", "Box squat"],
    substitutionOptions: ["Front squat", "Leg press", "Hack squat"],
  }),
  buildIntelligenceEntry({
    exerciseId: "front_squat",
    primaryMuscles: ["Quads"],
    secondaryMuscles: ["Glutes", "Core"],
    stabilizers: ["Core", "Upper back", "Wrist/elbow rack position"],
    jointConsiderations: [
      ...squatJoints,
      { joint: "wrist", stressLevel: "low", note: "Rack position mobility may limit loading." },
    ],
    movementAnalysis: {
      pattern: "squat",
      plane: "sagittal",
      primeActions: ["Knee extension", "Hip extension"],
      limitingFactors: ["Torso upright demand", "Rack mobility", "Ankle dorsiflexion"],
      stabilityDemand: "high",
    },
    programmingUseCases: [
      { goal: "strength", fit: "secondary", note: "Quad-dominant squat variation for athletes." },
      { goal: "skill", fit: "primary", note: "Teaches upright torso and front-rack positions." },
    ],
    fatigueProfile: {
      localFatigue: "high",
      systemicFatigue: "moderate",
      recoveryCost: "moderate",
      note: "Often limited by rack position before leg strength.",
    },
    coachingDecisionNotes: "Use when quad emphasis and upright torso are priorities over max load.",
    regressionOptions: ["Goblet squat", "Cross-arm front squat"],
    substitutionOptions: ["Hack squat", "High-bar back squat"],
  }),
  buildIntelligenceEntry({
    exerciseId: "hack_squat",
    primaryMuscles: ["Quads"],
    secondaryMuscles: ["Glutes", "Hamstrings"],
    stabilizers: ["Core"],
    jointConsiderations: [
      { joint: "knee", stressLevel: "moderate", note: "Fixed path can increase knee travel; scale depth/load." },
      { joint: "spine", stressLevel: "low", note: "Back support reduces spinal loading vs free squat." },
    ],
    movementAnalysis: {
      pattern: "squat",
      plane: "sagittal",
      primeActions: ["Knee extension", "Hip extension"],
      limitingFactors: ["Foot placement", "Depth tolerance"],
      stabilityDemand: "low",
    },
    programmingUseCases: [
      { goal: "hypertrophy", fit: "primary", note: "Isolated quad volume with less balance demand." },
      { goal: "rehab-prehab", fit: "secondary", note: "Supported pattern for returning to loading." },
    ],
    fatigueProfile: {
      localFatigue: "high",
      systemicFatigue: "low",
      recoveryCost: "moderate",
      note: "Local quad fatigue without heavy spinal/systemic cost.",
    },
    coachingDecisionNotes: "Machine option for quad volume when free-squat fatigue is high.",
    regressionOptions: ["Leg press narrow stance"],
    substitutionOptions: ["Leg press", "Front squat"],
  }),
  buildIntelligenceEntry({
    exerciseId: "leg_press",
    primaryMuscles: ["Quads", "Glutes"],
    secondaryMuscles: ["Hamstrings"],
    stabilizers: ["Core"],
    jointConsiderations: [
      { joint: "knee", stressLevel: "moderate", note: "Deep ranges increase knee flexion stress." },
      { joint: "hip", stressLevel: "low", note: "Foot placement shifts hip vs knee emphasis." },
      { joint: "spine", stressLevel: "low", note: "Pelvis should stay supported on pad." },
    ],
    movementAnalysis: {
      pattern: "squat",
      plane: "sagittal",
      primeActions: ["Knee extension", "Hip extension"],
      limitingFactors: ["Foot placement", "Pelvis position on pad"],
      stabilityDemand: "low",
    },
    programmingUseCases: [
      { goal: "hypertrophy", fit: "primary", note: "High leg volume with scalable load." },
      { goal: "general-fitness", fit: "primary", note: "Accessible lower-body loading." },
    ],
    fatigueProfile: {
      localFatigue: "high",
      systemicFatigue: "low",
      recoveryCost: "moderate",
      note: "Can accumulate quad volume without heavy spinal fatigue.",
    },
    coachingDecisionNotes: "Volume tool after main lifts or for clients needing supported leg work.",
    regressionOptions: ["Partial-ROM leg press"],
    substitutionOptions: ["Hack squat", "Goblet squat"],
  }),
  buildIntelligenceEntry({
    exerciseId: "romanian_deadlift",
    primaryMuscles: ["Hamstrings", "Glutes"],
    secondaryMuscles: ["Back"],
    stabilizers: ["Spinal erectors", "Core", "Grip"],
    jointConsiderations: hingeJoints,
    movementAnalysis: {
      pattern: "hinge",
      plane: "sagittal",
      primeActions: ["Hip flexion/extension", "Knee soft flexion"],
      limitingFactors: ["Hamstring length", "Lumbar position", "Grip"],
      stabilityDemand: "high",
    },
    programmingUseCases: [
      { goal: "hypertrophy", fit: "primary", note: "Posterior chain hypertrophy with manageable load." },
      { goal: "strength", fit: "secondary", note: "Accessory to deadlift or hip hinge day." },
    ],
    fatigueProfile: {
      localFatigue: "moderate",
      systemicFatigue: "moderate",
      recoveryCost: "moderate",
      note: "Hamstring soreness can affect subsequent hinge/sprint work.",
    },
    coachingDecisionNotes: "Preferred hip hinge when hamstring emphasis beats max absolute load.",
    regressionOptions: ["Dumbbell RDL", "Single-leg RDL"],
    substitutionOptions: ["Deadlift", "Good morning"],
  }),
  buildIntelligenceEntry({
    exerciseId: "deadlift",
    primaryMuscles: ["Back", "Glutes", "Hamstrings"],
    secondaryMuscles: ["Quads", "Core"],
    stabilizers: ["Core", "Grip", "Spinal erectors"],
    jointConsiderations: [
      ...hingeJoints,
      { joint: "knee", stressLevel: "moderate", note: "Initial knee bend varies by style." },
    ],
    movementAnalysis: {
      pattern: "hinge",
      plane: "sagittal",
      primeActions: ["Hip extension", "Knee extension"],
      limitingFactors: ["Setup consistency", "Grip", "Bracing"],
      stabilityDemand: "high",
    },
    programmingUseCases: [
      { goal: "strength", fit: "primary", note: "Full-body strength anchor." },
      { goal: "hypertrophy", fit: "secondary", note: "Moderate rep ranges for posterior chain volume." },
    ],
    fatigueProfile: {
      localFatigue: "high",
      systemicFatigue: "high",
      recoveryCost: "high",
      note: "High systemic and grip demand; plan recovery accordingly.",
    },
    coachingDecisionNotes: "Use sparingly as a session anchor; balance with pulling and hinge volume.",
    regressionOptions: ["Trap bar deadlift", "Rack pull"],
    substitutionOptions: ["Romanian deadlift", "Sumo deadlift"],
  }),
  buildIntelligenceEntry({
    exerciseId: "split_squat_dumbbell",
    primaryMuscles: ["Quads", "Glutes"],
    secondaryMuscles: ["Hamstrings"],
    stabilizers: ["Core", "Glute med", "Ankle stabilizers"],
    jointConsiderations: [
      { joint: "knee", stressLevel: "moderate", note: "Front knee flexion increases with stride length." },
      { joint: "hip", stressLevel: "moderate", note: "Split stance challenges hip stability." },
      { joint: "ankle", stressLevel: "low", note: "Rear foot balance requires ankle control." },
    ],
    movementAnalysis: {
      pattern: "lunge",
      plane: "sagittal",
      primeActions: ["Knee flexion/extension", "Hip flexion/extension"],
      limitingFactors: ["Balance", "Stride length", "Front foot placement"],
      stabilityDemand: "high",
    },
    programmingUseCases: [
      { goal: "hypertrophy", fit: "primary", note: "Unilateral quad/glute volume." },
      { goal: "rehab-prehab", fit: "secondary", note: "Single-leg stability and balance." },
    ],
    fatigueProfile: {
      localFatigue: "moderate",
      systemicFatigue: "low",
      recoveryCost: "moderate",
      note: "Balance demand limits absolute load vs bilateral squats.",
    },
    coachingDecisionNotes: "Canonical split squat variant — use for unilateral leg work and stability.",
    regressionOptions: ["Supported split squat", "Reverse lunge"],
    substitutionOptions: ["Bulgarian split squat", "Walking lunge"],
  }),
  buildIntelligenceEntry({
    exerciseId: "bulgarian_split_squat_dumbbell",
    primaryMuscles: ["Quads", "Glutes"],
    secondaryMuscles: ["Hamstrings"],
    stabilizers: ["Core", "Glute med", "Ankle stabilizers"],
    jointConsiderations: [
      { joint: "knee", stressLevel: "moderate", note: "Deep knee flexion on front leg; scale range." },
      { joint: "hip", stressLevel: "moderate", note: "Rear foot elevation increases hip flexion stretch." },
      { joint: "ankle", stressLevel: "low", note: "Front foot dorsiflexion under load." },
    ],
    movementAnalysis: {
      pattern: "lunge",
      plane: "sagittal",
      primeActions: ["Knee flexion/extension", "Hip flexion/extension"],
      limitingFactors: ["Balance", "Rear foot height", "Front leg strength"],
      stabilityDemand: "high",
    },
    programmingUseCases: [
      { goal: "hypertrophy", fit: "primary", note: "High unilateral quad/glute stimulus." },
      { goal: "strength", fit: "secondary", note: "Accessory for single-leg strength gaps." },
    ],
    fatigueProfile: {
      localFatigue: "high",
      systemicFatigue: "low",
      recoveryCost: "moderate",
      note: "Local quad burn is high; limit excessive failure sets.",
    },
    coachingDecisionNotes: "Best when unilateral leg hypertrophy is the design priority.",
    regressionOptions: ["Split squat", "Supported BSS"],
    substitutionOptions: ["Split squat", "Walking lunge"],
  }),
  buildIntelligenceEntry({
    exerciseId: "hip_thrust",
    primaryMuscles: ["Glutes"],
    secondaryMuscles: ["Hamstrings"],
    stabilizers: ["Core", "Spinal erectors"],
    jointConsiderations: [
      { joint: "hip", stressLevel: "moderate", note: "Full hip extension under load; scale ROM." },
      { joint: "spine", stressLevel: "low", note: "Supported upper back reduces spinal flexion stress." },
      { joint: "knee", stressLevel: "low", note: "Knee flexion is fixed by setup." },
    ],
    movementAnalysis: {
      pattern: "hinge",
      plane: "sagittal",
      primeActions: ["Hip extension"],
      limitingFactors: ["Pelvis positioning", "Rib flare", "Lockout control"],
      stabilityDemand: "moderate",
    },
    programmingUseCases: [
      { goal: "hypertrophy", fit: "primary", note: "Direct glute volume with progressive overload." },
      { goal: "strength", fit: "secondary", note: "Glute strength for athletic performance." },
    ],
    fatigueProfile: {
      localFatigue: "moderate",
      systemicFatigue: "low",
      recoveryCost: "low",
      note: "Glute-local fatigue; minimal systemic spillover.",
    },
    coachingDecisionNotes: "Glute isolation anchor when hip extension strength is the target.",
    regressionOptions: ["Glute bridge", "Single-leg hip thrust"],
    substitutionOptions: ["Cable pull-through", "Romanian deadlift"],
  }),
  buildIntelligenceEntry({
    exerciseId: "leg_curl",
    primaryMuscles: ["Hamstrings"],
    secondaryMuscles: ["Calves"],
    stabilizers: ["Core"],
    jointConsiderations: [
      { joint: "knee", stressLevel: "moderate", note: "Knee flexion under load; control eccentric." },
      { joint: "hip", stressLevel: "low", note: "Hip position affects hamstring length." },
    ],
    movementAnalysis: {
      pattern: "hinge",
      plane: "sagittal",
      primeActions: ["Knee flexion"],
      limitingFactors: ["Hip position on pad", "Eccentric control"],
      stabilityDemand: "low",
    },
    programmingUseCases: [
      { goal: "hypertrophy", fit: "primary", note: "Direct hamstring knee-flexion volume." },
      { goal: "rehab-prehab", fit: "secondary", note: "Isolated hamstring work with low spinal load." },
    ],
    fatigueProfile: {
      localFatigue: "moderate",
      systemicFatigue: "low",
      recoveryCost: "low",
      note: "Pair with hip-dominant hinges for balanced hamstring development.",
    },
    coachingDecisionNotes: "Use to complement RDL/deadlift patterns with knee-flexion hamstring work.",
    regressionOptions: ["Swiss ball curl", "Band leg curl"],
    substitutionOptions: ["Nordic curl progression", "Romanian deadlift"],
  }),
  buildIntelligenceEntry({
    exerciseId: "calf_raise",
    primaryMuscles: ["Calves"],
    secondaryMuscles: [],
    stabilizers: ["Ankle stabilizers", "Foot intrinsics"],
    jointConsiderations: [
      { joint: "ankle", stressLevel: "moderate", note: "Full plantarflexion range under load." },
      { joint: "knee", stressLevel: "low", note: "Bent vs straight knee shifts emphasis." },
    ],
    movementAnalysis: {
      pattern: "carry",
      plane: "sagittal",
      primeActions: ["Ankle plantarflexion"],
      limitingFactors: ["Range at bottom", "Balance on single-leg variants"],
      stabilityDemand: "low",
    },
    programmingUseCases: [
      { goal: "hypertrophy", fit: "primary", note: "Direct calf volume; high rep tolerance." },
      { goal: "general-fitness", fit: "optional", note: "Accessory for lower-leg resilience." },
    ],
    fatigueProfile: {
      localFatigue: "moderate",
      systemicFatigue: "low",
      recoveryCost: "low",
      note: "Calves recover quickly; can train frequently at moderate volume.",
    },
    coachingDecisionNotes: "Add when sport or aesthetics require dedicated calf volume.",
    regressionOptions: ["Seated calf raise", "Single-leg bodyweight calf raise"],
    substitutionOptions: ["Leg press calf raise", "Smith machine calf raise"],
  }),
];

/** Requested IDs that do not exist verbatim in EXERCISE_LIBRARY_V1 — documented for tests/report. */
export const SKIPPED_TOP20_REQUESTED_IDS = ["split_squat", "bulgarian_split_squat"] as const;
