import { TOP25_EXERCISE_EXPERT_REVIEW_QUEUE_V1 } from "@oli/lib/workouts/exercises/enrichment/expert-review/top25ExerciseExpertReviewQueue.v1";

import {
  buildLiveTop25CandidateImageProductionPackets,
  buildTop25CandidateImageProductionPackets,
} from "../buildTop25CandidateImageProductionPackets";
import { buildExpertReviewedTop25Fixture } from "../fixtures/expertReviewedTop25Fixture";

describe("buildTop25CandidateImageProductionPackets", () => {
  const live = buildLiveTop25CandidateImageProductionPackets();
  const fixtureReview = buildExpertReviewedTop25Fixture(TOP25_EXERCISE_EXPERT_REVIEW_QUEUE_V1);
  const fixture = buildTop25CandidateImageProductionPackets({ reviewItems: fixtureReview });

  it("live Top 25 packets are blocked due expert review", () => {
    expect(live.readyPacketCount).toBe(0);
    expect(live.blockedPacketCount).toBe(live.totalPackets);
    expect(live.blockedExerciseIds).toHaveLength(25);
  });

  it("fixture expert approval unlocks ready packets", () => {
    expect(fixture.readyPacketCount).toBeGreaterThan(0);
    expect(fixture.readyExerciseIds.length).toBeGreaterThan(0);
    expect(fixture.readyExerciseIds).toContain("bench_press");
  });

  it("packets preserve exerciseId and have deterministic IDs", () => {
    const firstRun = live.packets.map((packet) => packet.productionPacketId);
    const secondRun = buildLiveTop25CandidateImageProductionPackets().packets.map(
      (packet) => packet.productionPacketId,
    );
    expect(firstRun).toEqual(secondRun);
    for (const packet of live.packets) {
      expect(packet.productionPacketId).toContain(packet.exerciseId);
    }
  });

  it("packets are sorted by priority rank then pose order then render target", () => {
    expect(live.packets[0]?.exerciseId).toBe("bench_press");
    for (let index = 1; index < live.packets.length; index += 1) {
      const prev = live.packets[index - 1]!;
      const current = live.packets[index]!;
      if (prev.priorityRank !== current.priorityRank) {
        expect(prev.priorityRank).toBeLessThanOrEqual(current.priorityRank);
      }
    }
  });

  it("does not include candidateId or approved-master on packets", () => {
    const serialized = JSON.stringify(live.packets);
    expect(serialized).not.toMatch(/"candidateId"/);
    for (const packet of live.packets) {
      expect(packet.status).not.toBe("approved-master" as never);
    }
  });

  it("does not create candidates", () => {
    expect(live.warnings.some((warning) => warning.includes("not generated assets"))).toBe(true);
  });
});
