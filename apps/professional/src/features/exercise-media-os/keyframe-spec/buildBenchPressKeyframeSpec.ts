import { BENCH_PRESS_PILOT_EXERCISE_ID } from "../data/benchPressMasterMediaPackage";
import {
  BENCH_PRESS_HERO_DEMO_ACCEPTANCE_CRITERIA,
  BENCH_PRESS_KEYFRAME_GLOBAL_NEGATIVE_CRITERIA,
} from "../bench-press-product/benchPressHeroDemoQaStandard";
import {
  BENCH_PRESS_REQUIRED_POSE_IDS,
  BENCH_PRESS_REQUIRED_RENDER_TARGETS,
  EXERCISE_KEYFRAME_SPEC_VERSION,
  type ExerciseKeyframePose,
  type ExerciseKeyframeSpec,
} from "./types";

const BENCH_PRESS_KEYFRAME_SET_ID = "bench-press-keyframe-set-m1" as const;

function pose(
  poseId: ExerciseKeyframePose["poseId"],
  label: string,
  purpose: string,
  mustShow: readonly string[],
  acceptanceCriteria: readonly string[],
  negativeCriteria: readonly string[],
  requiredViews: ExerciseKeyframePose["requiredViews"] = ["front_45_right", "side"],
): ExerciseKeyframePose {
  return {
    poseId,
    label,
    purpose,
    requiredViews,
    mustShow,
    acceptanceCriteria,
    negativeCriteria,
  };
}

/** Build the Bench Press keyframe spec for Oli Motion Male M1 (Sprint M9). */
export function buildBenchPressKeyframeSpec(): ExerciseKeyframeSpec {
  const globalNegative = BENCH_PRESS_KEYFRAME_GLOBAL_NEGATIVE_CRITERIA;

  const requiredPoses: ExerciseKeyframePose[] = [
    pose(
      "setup",
      "Setup",
      "Establish bench position, grip, foot drive, and upper-back tightness before the first rep.",
      [
        "Athlete lying on flat bench",
        "Eyes under bar or slightly behind bar",
        "Hands set evenly on bar",
        "Feet planted on floor",
        "Upper back tight with scapulae retracted and depressed",
        "Glutes on bench",
        "Full bench, barbell, plates, and feet visible",
      ],
      [
        "Setup shows stable shoulder and foot position before unracking.",
        "Grip width even and wrists prepared to stack over elbows.",
        "Full bench, barbell, plates, and feet visible in master 16:9 view.",
        ...BENCH_PRESS_HERO_DEMO_ACCEPTANCE_CRITERIA.filter((criterion) =>
          criterion.includes("feet") || criterion.includes("bench"),
        ),
      ],
      [
        "Cropped bench or missing feet.",
        "Uneven grip or unstable shoulder setup.",
        ...globalNegative,
      ],
    ),
    pose(
      "start_lockout",
      "Start / Top Lockout",
      "Top-of-rep starting position with bar held motionless above chest/shoulder line.",
      [
        "Bar held motionless above chest/shoulder line",
        "Elbows locked or nearly locked",
        "Wrists stacked over elbows",
        "Shoulder blades retracted and depressed",
        "Stable torso and planted feet",
      ],
      [
        "Bar motionless at top lockout before descent begins.",
        "Wrists stacked over elbows with stable shoulder position.",
        "No second descent implied.",
      ],
      [
        "Bar drifting or unstable at lockout.",
        "Shoulders rolling forward.",
        ...globalNegative,
      ],
    ),
    pose(
      "bottom_chest_pause",
      "Bottom / Chest Pause",
      "Paused bottom position with bar lightly touching lower chest/sternum.",
      [
        "Bar lightly touching lower chest or sternum line",
        "Brief paused position — not bouncing",
        "Wrists stacked",
        "Elbows moderate — not extreme flare",
        "Feet planted",
        "No bar hovering above chest",
      ],
      [
        "Bar lightly touches lower chest or sternum line.",
        "Brief visible pause at bottom — no bounce.",
        "Wrists stacked with moderate elbow angle.",
        "Feet remain planted.",
      ],
      [
        "Bar not touching chest.",
        "Bar bouncing off chest.",
        "Bar hovering above chest without contact.",
        "Extreme elbow flare.",
        ...globalNegative,
      ],
      ["front_45_right", "side", "mobile_portrait_safe"],
    ),
    pose(
      "finish_lockout",
      "Finish / Lockout",
      "Return to full lockout after press — end of single rep sequence.",
      [
        "Bar returned to full lockout",
        "No second descent implied",
        "Stable bar path and controlled finish",
        "Same camera, character, and equipment continuity as prior poses",
      ],
      [
        "Controlled finish at full lockout.",
        "Exactly one rep sequence — no second descent implied.",
        "Character, equipment, and camera continuity maintained.",
      ],
      [
        "Second rep or partial second rep implied.",
        "Half rep or incomplete lockout.",
        ...globalNegative,
      ],
    ),
  ];

  return {
    exerciseId: BENCH_PRESS_PILOT_EXERCISE_ID,
    keyframeSetId: BENCH_PRESS_KEYFRAME_SET_ID,
    keyframeVersion: EXERCISE_KEYFRAME_SPEC_VERSION,
    characterId: "oli_motion_male_m1",
    exerciseName: "Bench Press",
    productionGoal:
      "Define the M9 authoritative keyframe production blueprint for barbell bench press — one perfect rep before any candidate image generation.",
    reviewStatus: "ready-for-expert-review",
    requiredPoses,
    requiredViews: ["front_45_right", "side", "mobile_portrait_safe"],
    renderTargets: [...BENCH_PRESS_REQUIRED_RENDER_TARGETS],
    equipmentRequirements: [
      "Flat bench press station",
      "Standard barbell with plates loaded symmetrically",
      "No spotter in frame",
    ],
    environmentRequirements: [
      "Premium dark Oli studio or controlled dark gym",
      "Clean uncluttered background",
      "Stable tripod or fixed camera positions",
    ],
    bodyRequirements: [
      "Scapulae retracted and depressed throughout setup and press",
      "Wrists stacked over elbows at bottom and lockout",
      "Bar touches lower chest/sternum line at bottom pause",
      "Feet flat and planted for leg drive stability",
    ],
    bodyLandmarks: [
      {
        landmarkId: "scapula",
        label: "Scapulae",
        description: "Retracted and depressed throughout setup and press.",
      },
      {
        landmarkId: "wrist-stack",
        label: "Wrist stack",
        description: "Wrists stacked over elbows at bottom and lockout.",
      },
      {
        landmarkId: "bar-chest-contact",
        label: "Bar-chest contact",
        description: "Bar touches lower chest/sternum line at bottom pause.",
      },
      {
        landmarkId: "foot-plant",
        label: "Foot plant",
        description: "Feet flat and planted for leg drive stability.",
      },
    ],
    equipmentLandmarks: [
      {
        landmarkId: "bar-path",
        label: "Bar path",
        description: "Vertical bar path over lower chest — no face drift.",
      },
      {
        landmarkId: "barbell-physics",
        label: "Barbell",
        description: "Straight rigid bar with symmetric plates — no warping.",
      },
      {
        landmarkId: "bench-full",
        label: "Bench",
        description: "Full bench pad visible — not cropped.",
      },
    ],
    acceptanceCriteria: [
      "Exactly one full rep sequence represented by setup → start_lockout → bottom_chest_pause → finish_lockout.",
      "Full bench, barbell, plates, and feet visible in master 16:9 view.",
      "Consistent Oli Motion Male M1 identity across all poses.",
      "Stable camera framing with clear bar path.",
      "Bar touches lower chest/sternum with brief pause at bottom.",
      "Wrists stacked, elbows moderate, feet planted, no bounce.",
      "Realistic human anatomy and realistic barbell physics.",
      "Premium dark Oli studio aesthetic.",
      "Clear on mobile portrait-safe crop.",
      "No visible logos, readable text, or watermark.",
      ...BENCH_PRESS_HERO_DEMO_ACCEPTANCE_CRITERIA,
    ],
    negativeCriteria: [...globalNegative],
    commonGenerationFailures: [
      "Warped barbell or distorted plates",
      "Distorted hands or impossible wrist angles",
      "Second rep or bounce at chest",
      "Bar path drifting toward face",
      "Watermark, logos, or readable text",
      "Inconsistent Oli Motion Male M1 identity",
    ],
    coachingIntent:
      "Teach one controlled bench press rep: setup, lockout start, paused chest touch, and confident finish.",
    qaFocus: [
      "Movement accuracy — bar path and chest touch",
      "Character consistency — Oli Motion Male M1",
      "Equipment continuity — bench, bar, plates",
      "Mobile readability — 9:16 and 1:1 crops",
      "AI failure modes — warped bar, distorted hands, impossible anatomy",
    ],
    futureVideoNotes: [
      "Video generation must be based on approved master keyframes only.",
      "Approved keyframe image pack is the source of truth for image-to-video generation.",
      "Video must not introduce a second rep or alter bar path from approved keyframes.",
      "Character anchor must match oli_motion_male_m1 wardrobe and proportions.",
    ],
  };
}

export function benchPressRequiredPoseIds(): readonly ExerciseKeyframePose["poseId"][] {
  return BENCH_PRESS_REQUIRED_POSE_IDS;
}
