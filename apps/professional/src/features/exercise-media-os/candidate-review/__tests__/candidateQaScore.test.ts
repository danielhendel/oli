import { buildCandidateQaScore } from "../buildCandidateQaScore";
import { BENCH_PRESS_HERO_DEMO_DEV_TEST_CANDIDATE } from "../data/benchPressMediaCandidates";
import type { CandidateQaDimensionScore, CandidateQaReview, CandidateRightsPacket } from "../types";
import { CANDIDATE_QA_DIMENSION_IDS } from "../types";

function perfectDimensionScores(): CandidateQaDimensionScore[] {
  return CANDIDATE_QA_DIMENSION_IDS.map((dimensionId) => ({
    dimensionId,
    score: 5 as const,
    weight: 1,
    notes: [],
  }));
}

function perfectRights(): CandidateRightsPacket {
  return {
    usageStatus: "cleared-for-oli-master",
    sourceOwnership: "oli-created",
    allowsCommercialUse: true,
    allowsClientPlayback: true,
    requiresAttribution: false,
    containsWatermark: false,
    containsLogosOrReadableText: false,
    notes: ["Cleared for Oli master media."],
  };
}

function perfectQa(): CandidateQaReview {
  return {
    reviewedBy: "expert-reviewer",
    reviewedAt: "2026-06-30T00:00:00.000Z",
    dimensionScores: perfectDimensionScores(),
    findings: [],
    masterApprovalChecklist: {
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
    },
  };
}

describe("buildCandidateQaScore", () => {
  it("scores a perfect candidate at 100 with approval eligibility", () => {
    const result = buildCandidateQaScore({
      qa: perfectQa(),
      rights: perfectRights(),
      status: "draft",
    });

    expect(result.score).toBe(100);
    expect(result.passedHardGates).toBe(true);
    expect(result.approvalEligible).toBe(true);
    expect(result.hardGateFailures).toEqual([]);
  });

  it("blocks master approval on watermark hard gate failure", () => {
    const result = buildCandidateQaScore({
      qa: {
        ...perfectQa(),
        masterApprovalChecklist: {
          ...perfectQa().masterApprovalChecklist,
          noWatermark: false,
        },
      },
      rights: perfectRights(),
    });

    expect(result.passedHardGates).toBe(false);
    expect(result.approvalEligible).toBe(false);
    expect(result.hardGateFailures).toContain("watermark");
  });

  it("blocks master approval on logos/readable text", () => {
    const result = buildCandidateQaScore({
      qa: perfectQa(),
      rights: {
        ...perfectRights(),
        containsLogosOrReadableText: true,
      },
    });

    expect(result.hardGateFailures).toContain("logos-readable-text");
    expect(result.approvalEligible).toBe(false);
  });

  it("blocks master approval when rights are not clear", () => {
    const result = buildCandidateQaScore({
      qa: perfectQa(),
      rights: {
        ...perfectRights(),
        usageStatus: "internal-dev-only",
        allowsClientPlayback: false,
      },
    });

    expect(result.hardGateFailures).toContain("rights-not-clear");
    expect(result.approvalEligible).toBe(false);
  });

  it("reduces score when biomechanics dimension is low", () => {
    const lowBiomechanics = perfectDimensionScores().map((row) =>
      row.dimensionId === "biomechanics" ? { ...row, score: 1 as const } : row,
    );

    const perfect = buildCandidateQaScore({ qa: perfectQa(), rights: perfectRights() }).score;
    const reduced = buildCandidateQaScore({
      qa: { ...perfectQa(), dimensionScores: lowBiomechanics },
      rights: perfectRights(),
    }).score;

    expect(reduced).toBeLessThan(perfect);
  });

  it("dev-test hero candidate is not approval eligible", () => {
    const candidate = BENCH_PRESS_HERO_DEMO_DEV_TEST_CANDIDATE;
    const result = buildCandidateQaScore({
      qa: candidate.qa,
      rights: candidate.rights,
      status: candidate.status,
    });

    expect(result.approvalEligible).toBe(false);
    expect(result.summaryLabel).toBe("dev-test-only");
    expect(result.hardGateFailures.length).toBeGreaterThan(0);
  });

  it("is deterministic for the same input", () => {
    const input = {
      qa: BENCH_PRESS_HERO_DEMO_DEV_TEST_CANDIDATE.qa,
      rights: BENCH_PRESS_HERO_DEMO_DEV_TEST_CANDIDATE.rights,
      status: BENCH_PRESS_HERO_DEMO_DEV_TEST_CANDIDATE.status,
    };

    expect(buildCandidateQaScore(input)).toEqual(buildCandidateQaScore(input));
  });
});
