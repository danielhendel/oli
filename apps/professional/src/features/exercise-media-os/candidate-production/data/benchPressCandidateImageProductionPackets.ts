import { buildBenchPressKeyframeSpec } from "../../keyframe-spec/buildBenchPressKeyframeSpec";
import { buildTop25KeyframeCandidateProductionQueue } from "../../keyframe-spec/buildTop25KeyframeCandidateProductionQueue";
import { buildCandidateImagePromptPacketFromQueueItem } from "../buildCandidateImagePromptPacket";
import { buildExpectedImport } from "../buildExpectedKeyframeImportPaths";
import type { CandidateImageProductionPacket } from "../types";

const BENCH_PRESS_PACKET_TIMESTAMP = "2026-06-30T00:00:00.000Z" as const;

/** Deterministic Bench Press production packets from M9 keyframe spec (planning only). */
export function buildBenchPressCandidateImageProductionPackets(): readonly CandidateImageProductionPacket[] {
  const spec = buildBenchPressKeyframeSpec();
  const queue = buildTop25KeyframeCandidateProductionQueue();
  const benchItems = queue.items.filter((item) => item.exerciseId === "bench_press");

  return benchItems.map((queueItem) => {
    const promptPacket = buildCandidateImagePromptPacketFromQueueItem(queueItem, spec);

    return {
      productionPacketId: `prod-packet-v1-${queueItem.exerciseId}-${queueItem.keyframePoseId}-${queueItem.renderTarget}-${queueItem.requiredView}`,
      exerciseId: queueItem.exerciseId,
      exerciseName: queueItem.exerciseName,
      characterId: queueItem.characterId,
      keyframePoseId: queueItem.keyframePoseId,
      poseLabel: queueItem.poseLabel,
      renderTarget: queueItem.renderTarget,
      requiredView: queueItem.requiredView,
      priorityRank: queueItem.priorityRank,
      status: "blocked-needs-expert-review",
      sourceTool: "google-flow",
      promptPacket,
      expectedImport: buildExpectedImport(
        queueItem.exerciseId,
        queueItem.keyframePoseId,
        queueItem.renderTarget,
        false,
      ),
      acceptanceCriteria: queueItem.acceptanceCriteria,
      negativeCriteria: queueItem.negativeCriteria,
      commonGenerationFailures: queueItem.commonGenerationFailures,
      qaFocus: queueItem.qaFocus,
      blockedReasons: ["Expert review approval required before external image generation."],
      createdAt: BENCH_PRESS_PACKET_TIMESTAMP,
      updatedAt: BENCH_PRESS_PACKET_TIMESTAMP,
    };
  });
}

export const BENCH_PRESS_CANDIDATE_IMAGE_PRODUCTION_PACKETS: readonly CandidateImageProductionPacket[] =
  buildBenchPressCandidateImageProductionPackets();
