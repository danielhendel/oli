export {
  buildTop25KeyframeCandidateProductionQueue,
  buildCandidateImageProductionQueue,
  TOP25_KEYFRAME_CANDIDATE_PRODUCTION_QUEUE_VERSION,
  type Top25KeyframeCandidateProductionQueue,
  type Top25KeyframeCandidateProductionQueueItem,
  type Top25KeyframeCandidateProductionStatus,
  type CandidateImageProductionQueue,
  type CandidateImageProductionQueueItem,
} from "./buildTop25KeyframeCandidateProductionQueue";

/** @deprecated Use TOP25_KEYFRAME_CANDIDATE_PRODUCTION_QUEUE_VERSION */
export const CANDIDATE_IMAGE_PRODUCTION_QUEUE_VERSION = "top25-keyframe-candidate-production-queue-v1" as const;
