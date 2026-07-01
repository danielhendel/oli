import { applyExerciseEnrichmentExpertReview } from "@oli/lib/workouts/exercises/enrichment/expert-review/applyExerciseEnrichmentExpertReview";
import type { ExerciseEnrichmentExpertReviewItem } from "@oli/lib/workouts/exercises/enrichment/expert-review/types";
import {
  listTop25ExerciseExpertReviewQueue,
  TOP25_EXERCISE_EXPERT_REVIEW_QUEUE_V1,
} from "@oli/lib/workouts/exercises/enrichment/expert-review/top25ExerciseExpertReviewQueue.v1";

import { buildTop25KeyframeCandidateProductionQueue } from "../keyframe-spec/buildTop25KeyframeCandidateProductionQueue";
import { getTop25ExerciseKeyframeSpecByExerciseId } from "../keyframe-spec/buildTop25ExerciseKeyframeSpecRegistry";
import { buildCandidateImagePromptPacketFromQueueItem } from "./buildCandidateImagePromptPacket";
import { buildExpectedImport } from "./buildExpectedKeyframeImportPaths";
import type {
  CandidateImageProductionPacket,
  CandidateImageProductionPacketStatus,
  CandidateImageProductionSourceTool,
  Top25CandidateImageProductionPacketsResult,
} from "./types";

const PACKET_TIMESTAMP = "2026-06-30T00:00:00.000Z" as const;

export type BuildTop25CandidateImageProductionPacketsOptions = {
  readonly reviewItems?: readonly ExerciseEnrichmentExpertReviewItem[];
  readonly allowedExerciseIds?: readonly string[];
  readonly batchSize?: number;
  readonly sourceTool?: CandidateImageProductionSourceTool;
};

function buildProductionPacketId(
  exerciseId: string,
  poseId: string,
  renderTarget: string,
  view: string,
): string {
  return `prod-packet-v1-${exerciseId}-${poseId}-${renderTarget}-${view}`;
}

function isExerciseProductionApproved(
  exerciseId: string,
  reviewByExerciseId: Map<string, ExerciseEnrichmentExpertReviewItem>,
): boolean {
  const item = reviewByExerciseId.get(exerciseId);
  if (!item) {
    return false;
  }
  return applyExerciseEnrichmentExpertReview(item).productionApproved;
}

function resolvePacketStatus(
  productionApproved: boolean,
  allowed: boolean,
): { readonly status: CandidateImageProductionPacketStatus; readonly blockedReasons: readonly string[] } {
  if (!productionApproved) {
    return {
      status: "blocked-needs-expert-review",
      blockedReasons: ["Expert review approval required before external image generation."],
    };
  }
  if (!allowed) {
    return {
      status: "blocked-needs-expert-review",
      blockedReasons: ["Exercise not included in allowedExerciseIds batch."],
    };
  }
  return { status: "ready-for-external-generation", blockedReasons: [] };
}

/** Build Top 25 candidate image production packets from keyframe specs and expert review gate. */
export function buildTop25CandidateImageProductionPackets(
  options: BuildTop25CandidateImageProductionPacketsOptions = {},
): Top25CandidateImageProductionPacketsResult {
  const reviewItems = options.reviewItems ?? TOP25_EXERCISE_EXPERT_REVIEW_QUEUE_V1;
  const reviewByExerciseId = new Map(reviewItems.map((item) => [item.exerciseId, item]));
  const queue = buildTop25KeyframeCandidateProductionQueue();
  const sourceTool = options.sourceTool ?? "google-flow";

  const warnings: string[] = [
    "Production packets are external-generation instructions — not generated assets or approved media.",
    "No candidateId or approved-master status is assigned by this builder.",
  ];

  const packets: CandidateImageProductionPacket[] = [];
  const readyExerciseIdSet = new Set<string>();
  const blockedExerciseIdSet = new Set<string>();

  let producedCount = 0;
  const batchLimit = options.batchSize ?? Number.POSITIVE_INFINITY;

  for (const queueItem of queue.items) {
    if (producedCount >= batchLimit) {
      break;
    }

    const spec = getTop25ExerciseKeyframeSpecByExerciseId(queueItem.exerciseId);
    if (!spec) {
      continue;
    }

    const productionApproved = isExerciseProductionApproved(queueItem.exerciseId, reviewByExerciseId);
    const allowed =
      options.allowedExerciseIds === undefined ||
      options.allowedExerciseIds.includes(queueItem.exerciseId);

    const { status, blockedReasons } = resolvePacketStatus(productionApproved, allowed);

    if (status === "ready-for-external-generation") {
      readyExerciseIdSet.add(queueItem.exerciseId);
    } else {
      blockedExerciseIdSet.add(queueItem.exerciseId);
    }

    const promptPacket = buildCandidateImagePromptPacketFromQueueItem(queueItem, spec);

    packets.push({
      productionPacketId: buildProductionPacketId(
        queueItem.exerciseId,
        queueItem.keyframePoseId,
        queueItem.renderTarget,
        queueItem.requiredView,
      ),
      exerciseId: queueItem.exerciseId,
      exerciseName: queueItem.exerciseName,
      characterId: queueItem.characterId,
      keyframePoseId: queueItem.keyframePoseId,
      poseLabel: queueItem.poseLabel,
      renderTarget: queueItem.renderTarget,
      requiredView: queueItem.requiredView,
      priorityRank: queueItem.priorityRank,
      status,
      sourceTool,
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
      blockedReasons,
      createdAt: PACKET_TIMESTAMP,
      updatedAt: PACKET_TIMESTAMP,
    });

    producedCount += 1;
  }

  const readyPacketCount = packets.filter(
    (packet) => packet.status === "ready-for-external-generation",
  ).length;
  const blockedPacketCount = packets.length - readyPacketCount;

  if (readyPacketCount === 0) {
    warnings.push("No packets ready for external generation — expert review approvals required.");
  }

  const nextRecommendedActions: string[] = [];
  if (blockedPacketCount > 0) {
    nextRecommendedActions.push("Complete expert review before generating candidate images externally.");
  }
  if (readyPacketCount > 0) {
    nextRecommendedActions.push("Use Google Flow with prompt packets — import results via local manifest only.");
  }
  nextRecommendedActions.push("Imported images become draft/dev-test candidates only — M10 QA required.");

  return {
    totalPackets: packets.length,
    readyPacketCount,
    blockedPacketCount,
    packets,
    blockedExerciseIds: [...blockedExerciseIdSet].sort((a, b) => a.localeCompare(b)),
    readyExerciseIds: [...readyExerciseIdSet].sort((a, b) => a.localeCompare(b)),
    warnings,
    nextRecommendedActions,
  };
}

/** Live Top 25 production packets — all blocked until expert review. */
export function buildLiveTop25CandidateImageProductionPackets(): Top25CandidateImageProductionPacketsResult {
  return buildTop25CandidateImageProductionPackets({
    reviewItems: listTop25ExerciseExpertReviewQueue(),
  });
}
