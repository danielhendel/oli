import type { ExerciseMediaCandidate } from "../../candidate-review/types";
import { CANDIDATE_QA_DIMENSION_IDS } from "../../candidate-review/types";
import { BENCH_PRESS_KEYFRAME_PUBLIC_PATHS } from "../types";
import type { BenchPressKeyframePoseId } from "../../keyframe-spec/types";

const FIXTURE_TIMESTAMP = "2026-06-30T10:00:00.000Z";

function perfectChecklist() {
  return {
    noWatermark: true,
    noLogosOrReadableText: true,
    correctCharacter: true,
    correctExercise: true,
    realisticAnatomy: true,
    realisticEquipment: true,
    educationallyClear: true,
    rightsClear: true,
    benchPressHeroSingleRep: true,
    benchPressBarTouchesChest: true,
    benchPressPauseOnChest: true,
    benchPressNoBounce: true,
    benchPressWristsStable: true,
    benchPressFeetPlanted: true,
  };
}

function perfectRights() {
  return {
    usageStatus: "cleared-for-oli-master" as const,
    sourceOwnership: "oli-created" as const,
    allowsCommercialUse: true,
    allowsClientPlayback: true,
    requiresAttribution: false,
    containsWatermark: false,
    containsLogosOrReadableText: false,
    notes: ["Fixture — cleared for Oli master media testing."],
  };
}

function buildApprovedFixtureCandidate(
  poseId: BenchPressKeyframePoseId,
  candidateId: string,
  coachingCaption: string,
): ExerciseMediaCandidate {
  const publicPath = BENCH_PRESS_KEYFRAME_PUBLIC_PATHS[poseId]["16:9"];

  return {
    candidateId,
    exerciseId: "bench_press",
    assetType: "image",
    status: "approved-master",
    characterId: "oli_motion_male_m1",
    keyframePoseId: poseId,
    renderTarget: "16:9",
    source: {
      tool: "local-fixture",
      project: "bench-press-image-pack-fixture",
      generatedAt: FIXTURE_TIMESTAMP,
    },
    prompt: {
      promptVersion: `fixture-${poseId}-v1`,
      promptText: `Fixture keyframe for ${poseId}`,
      negativePromptText: "watermark, logos, readable text, warped barbell",
    },
    localAsset: {
      expectedPublicPath: publicPath,
      existsInRepo: true,
    },
    qa: {
      reviewedBy: "fixture-qa-reviewer",
      reviewedAt: FIXTURE_TIMESTAMP,
      dimensionScores: CANDIDATE_QA_DIMENSION_IDS.map((dimensionId) => ({
        dimensionId,
        score: 5 as const,
        weight: 1,
        notes: ["Fixture — passes approval threshold"],
      })),
      findings: [],
      masterApprovalChecklist: perfectChecklist(),
    },
    rights: perfectRights(),
    lineage: {
      derivedFromKeyframeSetId: "bench-press-keyframe-set-m1",
      notes: ["Test fixture only — not live production data"],
    },
    reviewerNotes: [coachingCaption, "Human QA approval recorded in fixture."],
    rejectionReasons: [],
    createdAt: FIXTURE_TIMESTAMP,
    updatedAt: FIXTURE_TIMESTAMP,
  };
}

/** Four approved-master Bench Press image fixture candidates for unit tests. */
export const APPROVED_BENCH_PRESS_IMAGE_FIXTURE_CANDIDATES: readonly ExerciseMediaCandidate[] = [
  buildApprovedFixtureCandidate(
    "setup",
    "fixture_bench_press_setup_16x9",
    "Setup: shoulders down and back, feet planted, grip even.",
  ),
  buildApprovedFixtureCandidate(
    "start_lockout",
    "fixture_bench_press_start_lockout_16x9",
    "Start lockout: bar motionless above chest with wrists stacked.",
  ),
  buildApprovedFixtureCandidate(
    "bottom_chest_pause",
    "fixture_bench_press_bottom_chest_pause_16x9",
    "Bottom pause: bar lightly touches lower chest/sternum with brief pause.",
  ),
  buildApprovedFixtureCandidate(
    "finish_lockout",
    "fixture_bench_press_finish_lockout_16x9",
    "Finish lockout: controlled return to full lockout — end of single rep.",
  ),
];
