import { TOP25_EXERCISE_ENRICHMENT_IDS } from "@oli/lib/workouts/exercises/enrichment/libraryEnrichment.v1";

import { buildTop25KeyframeCandidateProductionQueue } from "../buildTop25KeyframeCandidateProductionQueue";

describe("buildTop25KeyframeCandidateProductionQueue", () => {
  const queue = buildTop25KeyframeCandidateProductionQueue();

  it("contains items for all Top 25 specs", () => {
    const exerciseIds = new Set(queue.items.map((item) => item.exerciseId));
    expect(exerciseIds.size).toBe(25);
    for (const exerciseId of TOP25_EXERCISE_ENRICHMENT_IDS) {
      expect(exerciseIds.has(exerciseId)).toBe(true);
    }
    expect(queue.totalExercises).toBe(25);
    expect(queue.totalRequiredKeyframes).toBeGreaterThan(0);
  });

  it("bench_press queue items include M9 poses", () => {
    const benchItems = queue.items.filter((item) => item.exerciseId === "bench_press");
    const poseIds = benchItems.map((item) => item.keyframePoseId);
    expect(poseIds).toEqual(
      expect.arrayContaining(["setup", "start_lockout", "bottom_chest_pause", "finish_lockout"]),
    );
  });

  it("queue item IDs are deterministic", () => {
    const firstRun = queue.items.map((item) => item.queueItemId);
    const secondRun = buildTop25KeyframeCandidateProductionQueue().items.map(
      (item) => item.queueItemId,
    );
    expect(firstRun).toEqual(secondRun);
    for (const item of queue.items) {
      expect(item.queueItemId).toMatch(/^.+__.+__.+__.+$/);
    }
  });

  it("queue is sorted by priority rank then pose order then render target", () => {
    for (let index = 1; index < queue.items.length; index += 1) {
      const prev = queue.items[index - 1]!;
      const current = queue.items[index]!;
      if (prev.priorityRank !== current.priorityRank) {
        expect(prev.priorityRank).toBeLessThanOrEqual(current.priorityRank);
      }
    }
    expect(queue.items[0]?.exerciseId).toBe("bench_press");
  });

  it("queue items include acceptance criteria", () => {
    for (const item of queue.items) {
      expect(item.acceptanceCriteria.length).toBeGreaterThan(0);
    }
  });

  it("queue items include negative criteria", () => {
    for (const item of queue.items) {
      expect(item.negativeCriteria.length).toBeGreaterThan(0);
    }
  });

  it("queue items include generation failure risks", () => {
    for (const item of queue.items) {
      expect(item.commonGenerationFailures.length).toBeGreaterThan(0);
    }
  });

  it("does not include candidateId", () => {
    const serialized = JSON.stringify(queue.items);
    expect(serialized).not.toMatch(/"candidateId"/i);
  });

  it("does not include asset paths", () => {
    const serialized = JSON.stringify(queue.items);
    expect(serialized).not.toMatch(/\.(png|jpg|webp)/i);
    expect(serialized).not.toMatch(/\/assets\//i);
  });

  it("does not mark anything approved-master", () => {
    const serialized = JSON.stringify(queue.items);
    expect(serialized).not.toMatch(/approved-master/i);
    for (const item of queue.items) {
      expect(item.productionStatus).not.toBe("approved-master" as never);
    }
  });

  it("does not create candidate assets", () => {
    expect(queue.warnings.some((warning) => warning.includes("does not create"))).toBe(true);
  });
});
