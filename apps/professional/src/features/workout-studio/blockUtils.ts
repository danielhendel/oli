import type { WorkoutBlock, WorkoutBlockType } from "./types";
import { WORKOUT_BLOCK_TYPE_LABELS } from "./types";

export function getBlockDisplayTitle(block: Pick<WorkoutBlock, "blockType" | "customTitle">): string {
  if (block.blockType === "custom" && block.customTitle.trim()) {
    return block.customTitle.trim();
  }
  return WORKOUT_BLOCK_TYPE_LABELS[block.blockType];
}

/**
 * Maps studio block types toward journal block types (preliminary).
 * Mobile journal: warmup | sets | superset | circuit | cooldown | cardio
 */
export function mapStudioBlockTypeToJournalBlockType(
  blockType: WorkoutBlockType,
): "warmup" | "sets" | "superset" | "circuit" | "cooldown" | "cardio" {
  switch (blockType) {
    case "warmUp":
    case "movementPrep":
    case "activation":
      return "warmup";
    case "superset":
      return "superset";
    case "circuit":
      return "circuit";
    case "set":
    case "primaryLift":
    case "secondaryLift":
    case "accessory":
      return "sets";
    case "conditioning":
    case "finisher":
      return "cardio";
    case "coolDown":
    case "mobility":
    case "prehabRehab":
    case "reflection":
      return "cooldown";
    default:
      return "sets";
  }
}
