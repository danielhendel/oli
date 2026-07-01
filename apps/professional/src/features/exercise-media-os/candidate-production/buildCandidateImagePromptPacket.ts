import { getOliMotionCharacterById } from "../character-registry/oliCharacterRegistry";
import type { OliCharacterId } from "../character-registry/types";
import type { Top25KeyframeCandidateProductionQueueItem } from "../keyframe-spec/buildTop25KeyframeCandidateProductionQueue";
import type { ExerciseKeyframeSpec } from "../keyframe-spec/types";
import {
  GOOGLE_FLOW_PROMPT_PACKET_VERSION,
  type GoogleFlowPromptPacket,
} from "./types";

const VIDEO_LANGUAGE_PATTERN = /\b(generate a video|animate|animation|loop)\b/i;

export type BuildCandidateImagePromptPacketInput = {
  readonly exerciseId: string;
  readonly exerciseName: string;
  readonly characterId: OliCharacterId;
  readonly keyframePoseId: string;
  readonly poseLabel: string;
  readonly posePurpose: string;
  readonly renderTarget: Top25KeyframeCandidateProductionQueueItem["renderTarget"];
  readonly requiredView: Top25KeyframeCandidateProductionQueueItem["requiredView"];
  readonly acceptanceCriteria: readonly string[];
  readonly negativeCriteria: readonly string[];
  readonly commonGenerationFailures: readonly string[];
  readonly qaFocus: readonly string[];
  readonly equipmentRequirements: readonly string[];
  readonly bodyRequirements: readonly string[];
  readonly environmentRequirements: readonly string[];
};

function buildPromptPacketId(
  exerciseId: string,
  poseId: string,
  renderTarget: string,
  view: string,
): string {
  return `prompt-packet-v1-${exerciseId}-${poseId}-${renderTarget}-${view}`;
}

function formatViewInstruction(view: string): string {
  switch (view) {
    case "front_45_right":
      return "front 45-degree right-side camera view";
    case "side":
      return "side profile camera view";
    case "mobile_portrait_safe":
      return "mobile portrait-safe crop with subject centered";
    default:
      return view;
  }
}

function buildCharacterInstruction(characterId: OliCharacterId): string {
  const character = getOliMotionCharacterById(characterId);
  if (!character) {
    return `Use locked Oli character identity: ${characterId}. Maintain consistent proportions and wardrobe.`;
  }
  return [
    `Use locked Oli character: ${character.displayName} (${characterId}).`,
    character.bodyType,
    `Wardrobe: ${character.wardrobe.base}`,
    "Maintain identical character identity across all keyframes.",
    "No visible logos, readable text, or watermarks on character or clothing.",
  ].join(" ");
}

function buildRenderTargetInstruction(renderTarget: string): string {
  switch (renderTarget) {
    case "16:9":
      return "Landscape 16:9 master review frame with full equipment visibility.";
    case "9:16":
      return "Portrait 9:16 crop optimized for mobile coaching playback.";
    case "1:1":
      return "Square 1:1 crop with subject centered and equipment readable.";
    default:
      return `Render target: ${renderTarget}`;
  }
}

/** Build a deterministic Google Flow prompt packet for a single keyframe. */
export function buildCandidateImagePromptPacket(
  input: BuildCandidateImagePromptPacketInput,
): GoogleFlowPromptPacket {
  const promptPacketId = buildPromptPacketId(
    input.exerciseId,
    input.keyframePoseId,
    input.renderTarget,
    input.requiredView,
  );

  const characterInstruction = buildCharacterInstruction(input.characterId);
  const sceneInstruction = [
    `Create a single still keyframe image for exercise: ${input.exerciseName} (${input.exerciseId}).`,
    "Do not show motion blur.",
    "Do not show multiple phases of the lift in one image.",
    "Do not include captions or text overlays.",
    "Premium dark Oli studio aesthetic.",
  ].join(" ");

  const poseInstruction = [
    `Pose: ${input.poseLabel} (${input.keyframePoseId}).`,
    input.posePurpose,
    ...input.bodyRequirements.slice(0, 3).map((req) => `Body visibility: ${req}`),
    ...input.equipmentRequirements.slice(0, 3).map((req) => `Equipment visibility: ${req}`),
  ].join(" ");

  const cameraInstruction = formatViewInstruction(input.requiredView);
  const renderTargetInstruction = buildRenderTargetInstruction(input.renderTarget);
  const wardrobeInstruction =
    "Premium dark training outfit with no logos, readable text, or brand marks.";
  const environmentInstruction = [
    ...input.environmentRequirements.slice(0, 2),
    "Clean uncluttered premium dark studio background.",
  ].join(" ");

  const acceptanceCriteriaText = [
    ...input.acceptanceCriteria,
    ...input.qaFocus,
    "No watermark, logos, or readable text.",
  ].join("; ");

  const negativePromptText = [
    ...input.negativeCriteria,
    ...input.commonGenerationFailures,
    "video",
    "animation",
    "loop",
    "motion blur",
    "multiple reps",
    "text overlay",
    "caption",
    "watermark",
    "logo",
    "readable text",
  ].join("; ");

  const fullPromptText = [
    sceneInstruction,
    characterInstruction,
    poseInstruction,
    `Camera: ${cameraInstruction}.`,
    renderTargetInstruction,
    wardrobeInstruction,
    `Environment: ${environmentInstruction}.`,
    `Acceptance criteria: ${acceptanceCriteriaText}`,
    `Negative prompt: ${negativePromptText}`,
  ].join("\n");

  const mainInstructions = [
    sceneInstruction,
    characterInstruction,
    poseInstruction,
    cameraInstruction,
    renderTargetInstruction,
    wardrobeInstruction,
    environmentInstruction,
    acceptanceCriteriaText,
  ].join("\n");

  if (VIDEO_LANGUAGE_PATTERN.test(mainInstructions)) {
    throw new Error("Prompt packet must not contain video/animation language in main instructions");
  }

  return {
    promptPacketId,
    promptVersion: GOOGLE_FLOW_PROMPT_PACKET_VERSION,
    characterInstruction,
    sceneInstruction,
    poseInstruction,
    cameraInstruction,
    renderTargetInstruction,
    wardrobeInstruction,
    environmentInstruction,
    acceptanceCriteriaText,
    negativePromptText,
    fullPromptText,
  };
}

export function buildCandidateImagePromptPacketFromQueueItem(
  queueItem: Top25KeyframeCandidateProductionQueueItem,
  spec: ExerciseKeyframeSpec,
): GoogleFlowPromptPacket {
  const pose = spec.requiredPoses.find((entry) => entry.poseId === queueItem.keyframePoseId);

  return buildCandidateImagePromptPacket({
    exerciseId: queueItem.exerciseId,
    exerciseName: queueItem.exerciseName,
    characterId: queueItem.characterId,
    keyframePoseId: queueItem.keyframePoseId,
    poseLabel: queueItem.poseLabel,
    posePurpose: pose?.purpose ?? queueItem.poseLabel,
    renderTarget: queueItem.renderTarget,
    requiredView: queueItem.requiredView,
    acceptanceCriteria: queueItem.acceptanceCriteria,
    negativeCriteria: queueItem.negativeCriteria,
    commonGenerationFailures: queueItem.commonGenerationFailures,
    qaFocus: queueItem.qaFocus,
    equipmentRequirements: spec.equipmentRequirements,
    bodyRequirements: spec.bodyRequirements,
    environmentRequirements: spec.environmentRequirements,
  });
}
