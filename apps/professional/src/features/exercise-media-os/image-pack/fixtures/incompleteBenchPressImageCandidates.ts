import type { ExerciseMediaCandidate } from "../../candidate-review/types";
import { BENCH_PRESS_HERO_DEMO_DEV_TEST_CANDIDATE } from "../../candidate-review/data/benchPressMediaCandidates";
import { APPROVED_BENCH_PRESS_IMAGE_FIXTURE_CANDIDATES } from "./approvedBenchPressImageCandidates";

const FIXTURE_TIMESTAMP = "2026-06-30T11:00:00.000Z";

/** Dev-test setup image — does not count as approved master. */
export const DEV_TEST_SETUP_IMAGE_FIXTURE: ExerciseMediaCandidate = {
  ...APPROVED_BENCH_PRESS_IMAGE_FIXTURE_CANDIDATES[0]!,
  candidateId: "fixture_bench_press_setup_dev_test",
  status: "dev-test",
  rights: {
    ...APPROVED_BENCH_PRESS_IMAGE_FIXTURE_CANDIDATES[0]!.rights,
    usageStatus: "internal-dev-only",
    allowsCommercialUse: false,
    allowsClientPlayback: false,
  },
  qa: {
    ...APPROVED_BENCH_PRESS_IMAGE_FIXTURE_CANDIDATES[0]!.qa,
    masterApprovalChecklist: {
      ...APPROVED_BENCH_PRESS_IMAGE_FIXTURE_CANDIDATES[0]!.qa.masterApprovalChecklist,
      rightsClear: false,
    },
  },
  updatedAt: FIXTURE_TIMESTAMP,
};

/** Three approved fixtures missing bottom_chest_pause. */
export const INCOMPLETE_BENCH_PRESS_IMAGE_FIXTURE_CANDIDATES: readonly ExerciseMediaCandidate[] = [
  APPROVED_BENCH_PRESS_IMAGE_FIXTURE_CANDIDATES[0]!,
  APPROVED_BENCH_PRESS_IMAGE_FIXTURE_CANDIDATES[1]!,
  APPROVED_BENCH_PRESS_IMAGE_FIXTURE_CANDIDATES[3]!,
];

/** Rights-not-cleared candidate blocks pack approval. */
export const RIGHTS_BLOCKED_FIXTURE_CANDIDATE: ExerciseMediaCandidate = {
  ...APPROVED_BENCH_PRESS_IMAGE_FIXTURE_CANDIDATES[2]!,
  candidateId: "fixture_bench_press_bottom_rights_blocked",
  rights: {
    usageStatus: "internal-dev-only",
    sourceOwnership: "oli-created",
    allowsCommercialUse: false,
    allowsClientPlayback: false,
    requiresAttribution: false,
    containsWatermark: false,
    containsLogosOrReadableText: false,
    notes: ["Rights not cleared — blocks master approval"],
  },
  qa: {
    ...APPROVED_BENCH_PRESS_IMAGE_FIXTURE_CANDIDATES[2]!.qa,
    masterApprovalChecklist: {
      ...APPROVED_BENCH_PRESS_IMAGE_FIXTURE_CANDIDATES[2]!.qa.masterApprovalChecklist,
      rightsClear: false,
    },
  },
};

/** Hard-gate failure blocks pack approval. */
export const HARD_GATE_FAILURE_FIXTURE_CANDIDATE: ExerciseMediaCandidate = {
  ...APPROVED_BENCH_PRESS_IMAGE_FIXTURE_CANDIDATES[2]!,
  candidateId: "fixture_bench_press_bottom_hard_gate_fail",
  qa: {
    ...APPROVED_BENCH_PRESS_IMAGE_FIXTURE_CANDIDATES[2]!.qa,
    masterApprovalChecklist: {
      ...APPROVED_BENCH_PRESS_IMAGE_FIXTURE_CANDIDATES[2]!.qa.masterApprovalChecklist,
      noWatermark: false,
    },
    findings: [
      {
        findingId: "watermark-fail",
        severity: "critical",
        category: "hardGate",
        message: "Watermark detected",
        blocksMasterApproval: true,
        hardGateId: "watermark",
      },
    ],
  },
};

/** Video candidate cannot satisfy image pack. */
export const VIDEO_CANDIDATE_FOR_IMAGE_PACK_TEST = BENCH_PRESS_HERO_DEMO_DEV_TEST_CANDIDATE;
