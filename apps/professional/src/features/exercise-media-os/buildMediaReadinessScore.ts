import { REQUIRED_SLOT_TYPES } from "./types";
import type {
  MasterMediaPackage,
  MediaReadinessScore,
  MediaReadinessStatus,
  MediaSlotType,
} from "./types";

function computeReadinessStatus(
  score: number,
  missingRequired: MediaSlotType[],
  approvedRequired: number,
): MediaReadinessStatus {
  if (missingRequired.length > 0) return "not-ready";
  if (approvedRequired === REQUIRED_SLOT_TYPES.length) return "ready";
  if (score >= 60) return "planned";
  return "partial";
}

function buildRecommendations(
  missingRequired: MediaSlotType[],
  plannedRequired: MediaSlotType[],
  packageComplete: boolean,
): string[] {
  const recommendations: string[] = [];
  if (missingRequired.length > 0) {
    recommendations.push(
      `Add required slots: ${missingRequired.map(formatSlotLabel).join(", ")}.`,
    );
  }
  if (plannedRequired.length > 0) {
    recommendations.push(
      `Review and approve planned required slots: ${plannedRequired.map(formatSlotLabel).join(", ")}.`,
    );
  }
  if (packageComplete && missingRequired.length === 0 && plannedRequired.length === 0) {
    recommendations.push("Master media package is complete and ready for client delivery.");
    return recommendations;
  }
  if (recommendations.length === 0) {
    recommendations.push("Master media package is planned and ready for production review.");
  }
  return recommendations;
}

function formatSlotLabel(slotType: MediaSlotType): string {
  return slotType.replace(/([A-Z])/g, " $1").trim();
}

/**
 * Deterministic readiness score for a master media package **slot metadata**.
 *
 * Measures blueprint/package slot planning status only — not whether playable media
 * files exist. For playable asset readiness use `buildMediaAssetReadinessScore`.
 */
export function buildMediaReadinessScore(mediaPackage: MasterMediaPackage): MediaReadinessScore {
  const requiredSlots = mediaPackage.slots.filter((slot) =>
    REQUIRED_SLOT_TYPES.includes(slot.slotType),
  );

  const missingRequiredSlots = requiredSlots
    .filter((slot) => slot.status === "missing")
    .map((slot) => slot.slotType);

  const plannedRequired = requiredSlots
    .filter((slot) => slot.status === "planned")
    .map((slot) => slot.slotType);

  const approvedSlots = mediaPackage.slots.filter((slot) => slot.status === "approved").length;
  const plannedSlots = mediaPackage.slots.filter((slot) => slot.status === "planned").length;
  const approvedRequired = requiredSlots.filter((slot) => slot.status === "approved").length;

  const statusWeights: Record<MasterMediaPackage["slots"][number]["status"], number> = {
    missing: 0,
    planned: 60,
    draft: 70,
    reviewed: 85,
    approved: 100,
  };

  const requiredScore =
    requiredSlots.length === 0
      ? 0
      : requiredSlots.reduce((sum, slot) => sum + statusWeights[slot.status], 0) /
        requiredSlots.length;

  const optionalSlots = mediaPackage.slots.filter(
    (slot) => !REQUIRED_SLOT_TYPES.includes(slot.slotType),
  );
  const optionalScore =
    optionalSlots.length === 0
      ? 100
      : optionalSlots.reduce((sum, slot) => sum + statusWeights[slot.status], 0) /
        optionalSlots.length;

  const score = Math.round(requiredScore * 0.75 + optionalScore * 0.25);
  const status = computeReadinessStatus(score, missingRequiredSlots, approvedRequired);

  return {
    score,
    status,
    missingRequiredSlots,
    approvedSlots,
    plannedSlots,
    recommendations: buildRecommendations(
      missingRequiredSlots,
      plannedRequired,
      mediaPackage.status === "complete",
    ),
  };
}
