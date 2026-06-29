import {
  BENCH_PRESS_PRODUCT_EXERCISE_ID,
  BENCH_PRESS_PRODUCT_VERSION,
  BENCH_PRESS_QA_VERSION,
} from "./benchPressProductConstants";
import type {
  BenchPressExpertMediaQAChecklist,
  BenchPressMediaStoryboard,
  BenchPressProductionBrief,
  BenchPressQACheckItem,
  BenchPressSceneQACheck,
} from "./types";

function check(
  checkId: string,
  category: BenchPressQACheckItem["category"],
  label: string,
  requirement: string,
  severity: BenchPressQACheckItem["severity"],
): BenchPressQACheckItem {
  return {
    checkId,
    category,
    label,
    requirement,
    severity,
    status: "not-reviewed",
  };
}

function buildSceneChecks(
  storyboard: BenchPressMediaStoryboard,
  brief: BenchPressProductionBrief,
): BenchPressSceneQACheck[] {
  return storyboard.scenes.map((scene) => {
    const sceneBrief = brief.scenes.find((row) => row.sceneId === scene.sceneId);
    const checks: BenchPressQACheckItem[] = [
      check(
        `${scene.sceneId}-movement`,
        "movement-accuracy",
        "Movement accuracy",
        "Demonstrated technique matches Academy execution and Intelligence movement analysis.",
        "required",
      ),
      check(
        `${scene.sceneId}-safety`,
        "safety",
        "Safety framing",
        "No unsafe exaggerations; joint considerations respected in coaching language.",
        "required",
      ),
      check(
        `${scene.sceneId}-clarity`,
        "teaching-clarity",
        "Teaching clarity",
        "Narration and on-screen text teach one clear objective.",
        "required",
      ),
      check(
        `${scene.sceneId}-visual`,
        "visual-quality",
        "Visual quality",
        "Premium cinematic dark gym aesthetic; stable framing; mobile-readable.",
        "required",
      ),
      check(
        `${scene.sceneId}-audio`,
        "audio-quality",
        "Audio / narration",
        "Voiceover is clear, paced for learning, and matches narration script.",
        "required",
      ),
      check(
        `${scene.sceneId}-overlay`,
        "overlay-accuracy",
        "Overlay accuracy",
        "Overlays match planned overlay instructions and do not mislead.",
        sceneBrief && sceneBrief.overlayPlan.length > 0 ? "required" : "recommended",
      ),
      check(
        `${scene.sceneId}-a11y`,
        "accessibility",
        "Accessibility",
        "Captions available; text contrast sufficient on mobile.",
        "required",
      ),
      check(
        `${scene.sceneId}-comprehension`,
        "client-comprehension",
        "Client comprehension",
        `Client can state objective: ${scene.clientLearningObjective.slice(0, 80)}…`,
        "required",
      ),
    ];

    return {
      sceneId: scene.sceneId,
      slotType: scene.slotType,
      checks,
    };
  });
}

function buildPackageChecks(storyboard: BenchPressMediaStoryboard): BenchPressQACheckItem[] {
  return [
    check(
      "pkg-scenes",
      "teaching-clarity",
      "All required scenes present",
      "Storyboard includes coachIntro, heroDemo, setup, execution, commonMistake, slowMotion, muscleOverlay, reflection.",
      "required",
    ),
    check(
      "pkg-duration",
      "visual-quality",
      "Total duration reasonable",
      `Total lesson duration is ${storyboard.totalDurationSeconds}s (~5 min max target for mobile).`,
      "required",
    ),
    check(
      "pkg-cues",
      "teaching-clarity",
      "No contradictory cues",
      "Scene narration and overlays do not contradict Academy teaching or Intelligence notes.",
      "required",
    ),
    check(
      "pkg-academy",
      "movement-accuracy",
      "Academy alignment",
      "Every scene references relevant Academy fields in storyboard.",
      "required",
    ),
    check(
      "pkg-intelligence",
      "movement-accuracy",
      "Intelligence alignment",
      "Muscle, joint, and programming notes align with Intelligence overlay.",
      "required",
    ),
    check(
      "pkg-mobile",
      "accessibility",
      "Mobile readability",
      "Text, overlays, and framing readable on phone-sized screens.",
      "required",
    ),
    check(
      "pkg-captions",
      "accessibility",
      "Captions required",
      "Full captions ship with final assets.",
      "required",
    ),
    check(
      "pkg-pro-approval",
      "client-comprehension",
      "Professional approval",
      "Expert reviewer sign-off required before client delivery.",
      "required",
    ),
  ];
}

/** Build expert media QA checklist for Bench Press product pipeline. */
export function buildBenchPressExpertMediaQAChecklist(
  storyboard: BenchPressMediaStoryboard,
  productionBrief: BenchPressProductionBrief,
): BenchPressExpertMediaQAChecklist {
  const sceneChecks = buildSceneChecks(storyboard, productionBrief);
  const packageChecks = buildPackageChecks(storyboard);

  const allChecks = [
    ...sceneChecks.flatMap((scene) => scene.checks),
    ...packageChecks,
  ];
  const requiredChecks = allChecks.filter((item) => item.severity === "required");
  const requiredPassed = requiredChecks.filter((item) => item.status === "pass").length;

  return {
    exerciseId: BENCH_PRESS_PRODUCT_EXERCISE_ID,
    productVersion: BENCH_PRESS_PRODUCT_VERSION,
    qaVersion: BENCH_PRESS_QA_VERSION,
    packageStatus: "not-reviewed",
    sceneChecks,
    packageChecks,
    approvalGate: {
      canApprove: false,
      requiredChecksTotal: requiredChecks.length,
      requiredChecksPassed: requiredPassed,
      status: "not-reviewed",
      message:
        "Expert review required — all required checks default to not-reviewed until production sign-off.",
    },
  };
}

export function countRequiredQAChecks(checklist: BenchPressExpertMediaQAChecklist): number {
  const sceneRequired = checklist.sceneChecks.flatMap((scene) =>
    scene.checks.filter((check) => check.severity === "required"),
  );
  const packageRequired = checklist.packageChecks.filter((check) => check.severity === "required");
  return sceneRequired.length + packageRequired.length;
}
