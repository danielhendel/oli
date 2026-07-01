import { BENCH_PRESS_PILOT_EXERCISE_ID } from "../../data/benchPressMasterMediaPackage";
import type {
  CandidateQaDimensionScore,
  ExerciseMediaCandidate,
} from "../types";
import { CANDIDATE_QA_DIMENSION_IDS } from "../types";

export const BENCH_PRESS_MEDIA_CANDIDATES_VERSION = "bench-press-candidates-v1" as const;

const BENCH_PRESS_HERO_DEMO_CANDIDATE_ID = "bench_press_hero_demo_google_flow_v1_dev_test" as const;

const DEV_TEST_DIMENSION_SCORES: CandidateQaDimensionScore[] = CANDIDATE_QA_DIMENSION_IDS.map(
  (dimensionId) => ({
    dimensionId,
    score: dimensionId === "technicalQuality" ? 3 : 2,
    weight: dimensionId === "movementAccuracy" || dimensionId === "biomechanics" ? 2 : 1,
    notes: ["Dev-test review — not master approved"],
  }),
);

/** Bench Press hero demo dev-test video candidate — local metadata only. */
export const BENCH_PRESS_HERO_DEMO_DEV_TEST_CANDIDATE: ExerciseMediaCandidate = {
  candidateId: BENCH_PRESS_HERO_DEMO_CANDIDATE_ID,
  exerciseId: BENCH_PRESS_PILOT_EXERCISE_ID,
  assetType: "video",
  status: "dev-test",
  characterId: "oli_motion_male_m1",
  mediaSlotId: "bench-press-heroDemo",
  renderTarget: "16:9",
  source: {
    tool: "google-flow",
    project: "oli-bench-press-hero-demo-pilot",
    generatedAt: "2026-06-15T10:00:00.000Z",
  },
  prompt: {
    promptVersion: "google-flow-bench-press-hero-demo-v1",
    promptText:
      "Professional barbell bench press demonstration. Athletic lifter on flat bench. Controlled full rep. Dark premium gym. Visible bar path.",
    negativePromptText:
      "second rep, partial rep, bounce, watermark, logos, readable text, warped barbell, distorted hands",
  },
  localAsset: {
    expectedPublicPath: "/media/exercises/bench_press/hero-demo.mp4",
    placeholderPath: "/media/exercises/bench_press/hero-demo.mp4",
    existsInRepo: false,
  },
  qa: {
    reviewedBy: "oli-media-review",
    reviewedAt: "2026-06-15T12:00:00.000Z",
    dimensionScores: DEV_TEST_DIMENSION_SCORES,
    findings: [
      {
        findingId: "hero-second-rep",
        severity: "critical",
        category: "hardGate",
        message: "Clip may contain a second rep or partial second rep — blocks master approval.",
        blocksMasterApproval: true,
        hardGateId: "bench-press-second-rep",
      },
      {
        findingId: "hero-watermark-unknown",
        severity: "major",
        category: "hardGate",
        message: "Watermark status unverified for dev-test clip.",
        blocksMasterApproval: true,
        hardGateId: "watermark",
      },
      {
        findingId: "hero-rights-dev-only",
        severity: "info",
        category: "rightsCleanliness",
        message: "Rights limited to internal dev-test — not cleared for Oli master.",
        blocksMasterApproval: true,
        hardGateId: "rights-not-clear",
      },
    ],
    masterApprovalChecklist: {
      noWatermark: false,
      noLogosOrReadableText: true,
      correctCharacter: true,
      correctExercise: true,
      realisticAnatomy: true,
      realisticEquipment: true,
      educationallyClear: true,
      rightsClear: false,
      benchPressHeroSingleRep: false,
      benchPressBarTouchesChest: true,
      benchPressPauseOnChest: false,
      benchPressNoBounce: true,
      benchPressWristsStable: true,
      benchPressFeetPlanted: true,
    },
  },
  rights: {
    usageStatus: "internal-dev-only",
    sourceOwnership: "oli-created",
    allowsCommercialUse: false,
    allowsClientPlayback: false,
    requiresAttribution: false,
    containsWatermark: false,
    containsLogosOrReadableText: false,
    notes: [
      "Internal dev-test only — usable for local playback wiring, not Oli master delivery.",
    ],
  },
  lineage: {
    derivedFromKeyframeSetId: "bench-press-keyframe-set-m1",
    notes: ["Generated before approved keyframe image pack exists."],
  },
  reviewerNotes: [
    "Usable for local playback/dev-test only — not approved master.",
    "Do not promote to approved-master until hero demo QA standard passes.",
  ],
  rejectionReasons: [],
  createdAt: "2026-06-15T10:00:00.000Z",
  updatedAt: "2026-06-15T12:00:00.000Z",
};

/** Local Bench Press media candidate seed list (Sprint M10). */
export const BENCH_PRESS_MEDIA_CANDIDATES: readonly ExerciseMediaCandidate[] = [
  BENCH_PRESS_HERO_DEMO_DEV_TEST_CANDIDATE,
];

export function getBenchPressMediaCandidateById(
  candidateId: string,
): ExerciseMediaCandidate | undefined {
  return BENCH_PRESS_MEDIA_CANDIDATES.find((candidate) => candidate.candidateId === candidateId);
}

export function isBenchPressHeroDemoDevTestCandidate(candidateId: string): boolean {
  return candidateId === BENCH_PRESS_HERO_DEMO_CANDIDATE_ID;
}
