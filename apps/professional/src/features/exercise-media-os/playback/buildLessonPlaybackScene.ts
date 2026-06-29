import type { MediaSlot } from "../types";
import type { BenchPressProductionSceneBrief } from "../bench-press-product/types";
import type { BenchPressStoryboardScene } from "../bench-press-product/types";

import type { LessonPlaybackScene, LessonPlaybackSource, LessonPlaybackMediaAsset, PlaceholderVisual } from "./types";

const SLOT_ICONS: Record<string, string> = {
  coachIntro: "🎙",
  heroDemo: "▶",
  setup: "⬚",
  execution: "↕",
  commonMistake: "⚠",
  slowMotion: "◎",
  muscleOverlay: "◉",
  jointOverlay: "◉",
  reflection: "✓",
};

const SLOT_GRADIENTS: Record<string, string> = {
  coachIntro: "linear-gradient(145deg, #1a1f35 0%, #2d3560 55%, #1e2438 100%)",
  heroDemo: "linear-gradient(145deg, #121820 0%, #243048 50%, #1a2230 100%)",
  setup: "linear-gradient(145deg, #141c28 0%, #2a3848 55%, #182028 100%)",
  execution: "linear-gradient(145deg, #101820 0%, #283850 50%, #161e28 100%)",
  commonMistake: "linear-gradient(145deg, #221818 0%, #3a2830 55%, #1e1818 100%)",
  slowMotion: "linear-gradient(145deg, #141828 0%, #304060 55%, #182030 100%)",
  muscleOverlay: "linear-gradient(145deg, #181828 0%, #382848 55%, #201828 100%)",
  reflection: "linear-gradient(145deg, #181c28 0%, #283848 55%, #1a2028 100%)",
};

const SLOT_MOTION_CUES: Record<string, string> = {
  coachIntro: "Slow push-in · welcome beat",
  heroDemo: "Controlled full rep · working tempo",
  setup: "Static setup walkthrough",
  execution: "Rep rhythm · descent and drive",
  commonMistake: "Contrast cut · mistake vs fix",
  slowMotion: "Slow motion · chest touch hold",
  muscleOverlay: "Anatomy pulse · muscle highlight",
  reflection: "Gentle fade · technique check",
};

function buildPlaceholderVisual(slot: MediaSlot): PlaceholderVisual {
  const slotType = slot.slotType;
  return {
    label: slot.placeholderVisualLabel ?? slot.title,
    treatment: slot.visualTreatment ?? "cinematic",
    icon: SLOT_ICONS[slotType] ?? "▶",
    gradientHint: SLOT_GRADIENTS[slotType] ?? SLOT_GRADIENTS.heroDemo ?? "linear-gradient(145deg, #121820 0%, #243048 50%, #1a2230 100%)",
    overlayLabels: slot.visualTheme ? [slot.visualTheme.replace(/-/g, " ")] : [],
    motionCue: SLOT_MOTION_CUES[slotType] ?? "Cinematic lesson beat",
  };
}

export type BuildLessonPlaybackSceneInput = {
  storyboardScene: BenchPressStoryboardScene;
  sceneBrief: BenchPressProductionSceneBrief;
  slot: MediaSlot;
  order: number;
  totalScenes: number;
  source: LessonPlaybackSource;
  coachMessage?: string;
  nextSceneId?: string;
  previousSceneId?: string;
  mediaAsset?: LessonPlaybackMediaAsset;
};

/** Build a single lesson playback scene from pipeline and package metadata. */
export function buildLessonPlaybackScene(input: BuildLessonPlaybackSceneInput): LessonPlaybackScene {
  const { storyboardScene, sceneBrief, slot, order, totalScenes, source } = input;

  return {
    sceneId: storyboardScene.sceneId,
    slotId: slot.slotId,
    slotType: slot.slotType,
    order,
    title: slot.title,
    subtitle: sceneBrief.onScreenText,
    durationSeconds: slot.recommendedDurationSeconds,
    narrationScript: sceneBrief.narrationScript,
    onScreenText: sceneBrief.onScreenText,
    clientPurpose: slot.clientPurpose ?? storyboardScene.clientLearningObjective,
    professionalPurpose: slot.professionalPurpose ?? storyboardScene.professionalIntent,
    visualLabel: slot.placeholderVisualLabel ?? slot.title,
    visualTreatment: slot.visualTreatment ?? "cinematic",
    placeholderVisual: buildPlaceholderVisual(slot),
    mediaAsset: input.mediaAsset,
    coachMessage: input.coachMessage,
    source,
    progressLabel: `Scene ${order + 1} of ${totalScenes} · ${slot.title}`,
    nextSceneId: input.nextSceneId,
    previousSceneId: input.previousSceneId,
  };
}
