import { TOP25_EXERCISE_ENRICHMENT_IDS } from "@oli/lib/workouts/exercises/enrichment/libraryEnrichment.v1";

import { buildBenchPressKeyframeSpec } from "../buildBenchPressKeyframeSpec";
import { buildKeyframeSpecSeedPlanFromEnrichment } from "../buildKeyframeSpecSeedPlanFromEnrichment";

describe("buildKeyframeSpecSeedPlanFromEnrichment", () => {
  it("bench_press seed plan aligns with M9 poses", () => {
    const plan = buildKeyframeSpecSeedPlanFromEnrichment("bench_press");
    const m9PoseIds = buildBenchPressKeyframeSpec().requiredPoses.map((p) => p.poseId);
    const seedPoseIds = plan.keyframePosePlans.map((p) => p.poseId);

    expect(seedPoseIds).toEqual(
      expect.arrayContaining(["setup", "start_lockout", "bottom_chest_pause", "finish_lockout"]),
    );
    for (const poseId of m9PoseIds) {
      expect(seedPoseIds).toContain(poseId);
    }
  });

  it("top25 enriched exercises produce non-empty pose plans", () => {
    for (const id of TOP25_EXERCISE_ENRICHMENT_IDS) {
      const plan = buildKeyframeSpecSeedPlanFromEnrichment(id);
      expect(plan.keyframePosePlans.length).toBeGreaterThanOrEqual(3);
      expect(plan.status).toBe("needs-expert-review");
    }
  });

  it("every pose has acceptance and negative criteria", () => {
    const plan = buildKeyframeSpecSeedPlanFromEnrichment("squat");
    for (const pose of plan.keyframePosePlans) {
      expect(pose.acceptanceCriteria.length).toBeGreaterThan(0);
      expect(pose.negativeCriteria.length).toBeGreaterThan(0);
      expect(pose.coachingCaption.trim().length).toBeGreaterThan(0);
    }
  });

  it("render targets include 16:9", () => {
    const plan = buildKeyframeSpecSeedPlanFromEnrichment("deadlift");
    expect(plan.renderTargets).toContain("16:9");
  });

  it("missing enrichment returns missing-enrichment", () => {
    const plan = buildKeyframeSpecSeedPlanFromEnrichment("pause_squat");
    expect(plan.status).toBe("missing-enrichment");
    expect(plan.keyframePosePlans).toHaveLength(0);
  });

  it("no candidate or image pack approval is created", () => {
    const plan = buildKeyframeSpecSeedPlanFromEnrichment("bench_press");
    expect(plan.warnings.some((w) => w.includes("No approved media"))).toBe(true);
    expect(plan.status).not.toBe("approved-master" as string);
  });
});
