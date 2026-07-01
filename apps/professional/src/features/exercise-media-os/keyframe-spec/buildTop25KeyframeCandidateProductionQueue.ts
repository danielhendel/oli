import { getExerciseLibraryEnrichmentById } from "@oli/lib/workouts/exercises/enrichment/libraryEnrichment.v1";
import { TOP25_EXERCISE_ENRICHMENT_IDS } from "@oli/lib/workouts/exercises/enrichment/libraryEnrichment.v1";
import { TOP50_EXERCISE_PRIORITY_PLAN_V1 } from "@oli/lib/workouts/exercises/enrichment/top50ExercisePriorityPlan.v1";
import { applyExerciseEnrichmentExpertReview } from "@oli/lib/workouts/exercises/enrichment/expert-review/applyExerciseEnrichmentExpertReview";
import type { ExerciseEnrichmentExpertReviewItem } from "@oli/lib/workouts/exercises/enrichment/expert-review/types";
import { TOP25_EXERCISE_EXPERT_REVIEW_QUEUE_V1 } from "@oli/lib/workouts/exercises/enrichment/expert-review/top25ExerciseExpertReviewQueue.v1";

import type { OliCharacterId } from "../character-registry/types";
import type { MediaAssetAspectRatio } from "../types";
import {
  getTop25ExerciseKeyframeSpecByExerciseId,
  listTop25ExerciseKeyframeSpecs,
} from "./buildTop25ExerciseKeyframeSpecRegistry";
import type { ExerciseKeyframeViewId, KeyframeRenderTarget } from "./types";
import { validateExerciseKeyframeSpec } from "./validateExerciseKeyframeSpec";

export const TOP25_KEYFRAME_CANDIDATE_PRODUCTION_QUEUE_VERSION =
  "top25-keyframe-candidate-production-queue-v1" as const;

export type Top25KeyframeCandidateProductionStatus =
  | "not-started"
  | "blocked"
  | "ready-for-generation"
  | "needs-expert-review";

export type Top25KeyframeCandidateProductionQueueItem = {
  readonly queueItemId: string;
  readonly exerciseId: string;
  readonly exerciseName: string;
  readonly characterId: OliCharacterId;
  readonly keyframePoseId: string;
  readonly poseLabel: string;
  readonly renderTarget: KeyframeRenderTarget;
  readonly requiredView: ExerciseKeyframeViewId;
  readonly priorityRank: number;
  readonly productionStatus: Top25KeyframeCandidateProductionStatus;
  readonly promptSeedSummary: string;
  readonly acceptanceCriteria: readonly string[];
  readonly negativeCriteria: readonly string[];
  readonly commonGenerationFailures: readonly string[];
  readonly qaFocus: readonly string[];
  readonly notes: readonly string[];
};

export type Top25KeyframeCandidateProductionQueue = {
  readonly queueId: string;
  readonly generatedFrom: string;
  readonly queueVersion: typeof TOP25_KEYFRAME_CANDIDATE_PRODUCTION_QUEUE_VERSION;
  readonly totalExercises: number;
  readonly totalRequiredKeyframes: number;
  readonly items: readonly Top25KeyframeCandidateProductionQueueItem[];
  readonly warnings: readonly string[];
};

export type BuildTop25KeyframeCandidateProductionQueueOptions = {
  readonly reviewItems?: readonly ExerciseEnrichmentExpertReviewItem[];
};

const RENDER_TARGET_SORT_ORDER: Record<MediaAssetAspectRatio, number> = {
  "16:9": 0,
  "9:16": 1,
  "1:1": 2,
};

function resolvePriorityRank(exerciseId: string): number {
  const entry = TOP50_EXERCISE_PRIORITY_PLAN_V1.find((item) => item.exerciseId === exerciseId);
  return entry?.priorityRank ?? 99;
}

function resolveProductionStatus(
  specValid: boolean,
  hasSpec: boolean,
  reviewItem: ExerciseEnrichmentExpertReviewItem | null,
): Top25KeyframeCandidateProductionStatus {
  if (!hasSpec || !specValid) {
    return "blocked";
  }
  if (!reviewItem) {
    return "needs-expert-review";
  }
  const reviewResult = applyExerciseEnrichmentExpertReview(reviewItem);
  if (!reviewResult.productionApproved) {
    return "needs-expert-review";
  }
  return "ready-for-generation";
}

function buildQueueItemId(
  exerciseId: string,
  poseId: string,
  renderTarget: KeyframeRenderTarget,
  requiredView: ExerciseKeyframeViewId,
): string {
  return `${exerciseId}__${poseId}__${renderTarget}__${requiredView}`;
}

function buildPromptSeedSummary(
  exerciseName: string,
  poseLabel: string,
  characterId: OliCharacterId,
  renderTarget: KeyframeRenderTarget,
  requiredView: ExerciseKeyframeViewId,
): string {
  return `${exerciseName} — ${poseLabel} — ${characterId} — ${requiredView} — ${renderTarget}`;
}

function buildQueueItems(
  reviewItems: readonly ExerciseEnrichmentExpertReviewItem[],
): Top25KeyframeCandidateProductionQueueItem[] {
  const reviewByExerciseId = new Map(reviewItems.map((item) => [item.exerciseId, item]));
  const items: Top25KeyframeCandidateProductionQueueItem[] = [];

  for (const exerciseId of TOP25_EXERCISE_ENRICHMENT_IDS) {
    const spec = getTop25ExerciseKeyframeSpecByExerciseId(exerciseId);
    const enrichment = getExerciseLibraryEnrichmentById(exerciseId);
    const validation = spec ? validateExerciseKeyframeSpec(spec) : { valid: false, issues: [] };
    const priorityRank = resolvePriorityRank(exerciseId);
    const reviewItem = reviewByExerciseId.get(exerciseId) ?? null;
    const productionStatus = resolveProductionStatus(validation.valid, spec !== null, reviewItem);

    if (!spec) {
      continue;
    }

    const masterView: ExerciseKeyframeViewId =
      spec.requiredViews.find((view) => view === "front_45_right") ?? spec.requiredViews[0]!;

    for (const pose of spec.requiredPoses) {
      for (const renderTarget of spec.renderTargets) {
        const notes: string[] = [
          "Planning-only queue item — no candidate asset created.",
          "No media approval status implied.",
        ];
        if (exerciseId === "bench_press") {
          notes.push("M9 authoritative keyframe spec — M11 image pack pilot (no live approved images).");
        }
        if (enrichment?.reviewStatus === "ready-for-expert-review") {
          notes.push("Enrichment awaits expert review gate approval before generation eligibility.");
        }
        if (reviewItem?.status === "not-started") {
          notes.push("Expert review gate: not-started.");
        }

        items.push({
          queueItemId: buildQueueItemId(exerciseId, pose.poseId, renderTarget, masterView),
          exerciseId,
          exerciseName: spec.exerciseName,
          characterId: spec.characterId,
          keyframePoseId: pose.poseId,
          poseLabel: pose.label,
          renderTarget,
          requiredView: masterView,
          priorityRank,
          productionStatus,
          promptSeedSummary: buildPromptSeedSummary(
            spec.exerciseName,
            pose.label,
            spec.characterId,
            renderTarget,
            masterView,
          ),
          acceptanceCriteria: pose.acceptanceCriteria,
          negativeCriteria: pose.negativeCriteria,
          commonGenerationFailures: spec.commonGenerationFailures,
          qaFocus: spec.qaFocus,
          notes,
        });
      }
    }
  }

  items.sort((a, b) => {
    if (a.priorityRank !== b.priorityRank) {
      return a.priorityRank - b.priorityRank;
    }
    const poseOrderA =
      listTop25ExerciseKeyframeSpecs()
        .find((spec) => spec.exerciseId === a.exerciseId)
        ?.requiredPoses.findIndex((pose) => pose.poseId === a.keyframePoseId) ?? 0;
    const poseOrderB =
      listTop25ExerciseKeyframeSpecs()
        .find((spec) => spec.exerciseId === b.exerciseId)
        ?.requiredPoses.findIndex((pose) => pose.poseId === b.keyframePoseId) ?? 0;
    if (poseOrderA !== poseOrderB) {
      return poseOrderA - poseOrderB;
    }
    return RENDER_TARGET_SORT_ORDER[a.renderTarget] - RENDER_TARGET_SORT_ORDER[b.renderTarget];
  });

  return items;
}

/** Build a planning-only candidate production queue from Top 25 keyframe specs. */
export function buildTop25KeyframeCandidateProductionQueue(
  options: BuildTop25KeyframeCandidateProductionQueueOptions = {},
): Top25KeyframeCandidateProductionQueue {
  const reviewItems = options.reviewItems ?? TOP25_EXERCISE_EXPERT_REVIEW_QUEUE_V1;
  const items = buildQueueItems(reviewItems);
  const exerciseIds = new Set(items.map((item) => item.exerciseId));

  return {
    queueId: "top25-keyframe-candidate-production-queue-v1",
    generatedFrom: "top25-keyframe-spec-registry-v1",
    queueVersion: TOP25_KEYFRAME_CANDIDATE_PRODUCTION_QUEUE_VERSION,
    totalExercises: exerciseIds.size,
    totalRequiredKeyframes: items.length,
    items,
    warnings: [
      "This queue is planning-only — it does not create or approve candidate assets.",
      "No candidate identifiers or asset paths are assigned.",
      "ready-for-generation requires expert review gate approval — none are eligible in live M14 state.",
    ],
  };
}

/** @deprecated Use buildTop25KeyframeCandidateProductionQueue */
export function buildCandidateImageProductionQueue(): Top25KeyframeCandidateProductionQueue {
  return buildTop25KeyframeCandidateProductionQueue();
}

export type CandidateImageProductionQueue = Top25KeyframeCandidateProductionQueue;
export type CandidateImageProductionQueueItem = Top25KeyframeCandidateProductionQueueItem;
