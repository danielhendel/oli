import type { ClientMediaTimelineItem } from "@/features/exercise-media-os/types";

import { getModuleIcon, type FocusCardOption } from "./mediaLessonDirectorUi";

export type LessonScenePreviewState = "active" | "ready" | "planned";

export type LessonScene = {
  id: string;
  sceneKey: string;
  icon: string;
  title: string;
  purpose: string;
  durationSeconds?: number;
  previewState: LessonScenePreviewState;
  source?: ClientMediaTimelineItem["source"];
};

export type ExperienceRoadmapCard = {
  id: string;
  title: string;
  description: string;
  icon: string;
};

export const EXPERIENCE_ROADMAP_CARDS: ExperienceRoadmapCard[] = [
  {
    id: "ai-lesson",
    title: "AI Lesson Generation",
    description: "Generate narration, captions, and lesson pacing from your coaching style.",
    icon: "✦",
  },
  {
    id: "coach-video",
    title: "Coach Video",
    description: "Record or layer your presence over Oli master demonstrations.",
    icon: "▶",
  },
  {
    id: "voice-cloning",
    title: "Voice Cloning",
    description: "Deliver lessons in your voice without re-recording every exercise.",
    icon: "◌",
  },
  {
    id: "motion-graphics",
    title: "Motion Graphics",
    description: "Dynamic muscle overlays, path traces, and emphasis animations.",
    icon: "◆",
  },
  {
    id: "adaptive-playback",
    title: "Adaptive Playback",
    description: "Client-aware pacing that adjusts to skill level and session context.",
    icon: "↻",
  },
];

const NARRATIVE_SCENE_ORDER = [
  "coachIntro",
  "heroDemo",
  "setup",
  "execution",
  "commonMistake",
  "reflection",
] as const;

const SCENE_TITLES: Record<string, string> = {
  coachIntro: "Coach Introduction",
  heroDemo: "Movement Demonstration",
  setup: "Setup",
  execution: "Execution",
  commonMistake: "Common Mistake",
  slowMotion: "Slow Motion",
  muscleOverlay: "Visual Overlay",
  jointOverlay: "Joint Overlay",
  reflection: "Reflection",
};

export function resolveSelectedGoal(
  focusCards: FocusCardOption[],
  selectedEmphasis: string,
): FocusCardOption {
  return (
    focusCards.find((card) => card.emphasis === selectedEmphasis) ??
    focusCards[0] ?? {
      id: "default-goal",
      title: "Movement Quality",
      description: "Help your client learn this exercise with clarity and confidence.",
      estimatedMinutes: 2,
      icon: "◎",
      emphasis: "setup",
    }
  );
}

export function buildLessonNarrativeScenes(input: {
  goal: FocusCardOption;
  timelineItems: ClientMediaTimelineItem[];
  activeSceneId?: string;
}): LessonScene[] {
  const goalScene: LessonScene = {
    id: "scene-goal",
    sceneKey: "goal",
    icon: input.goal.icon,
    title: "Goal",
    purpose: `${input.goal.title} — ${input.goal.description}`,
    previewState: input.activeSceneId === "scene-goal" ? "active" : "ready",
  };

  const narrativeScenes: LessonScene[] = [];

  for (const slotType of NARRATIVE_SCENE_ORDER) {
    const item = input.timelineItems.find((row) => row.slotType === slotType);
    if (!item) continue;

    narrativeScenes.push({
      id: item.itemId,
      sceneKey: slotType,
      icon: getModuleIcon(slotType),
      title: SCENE_TITLES[slotType] ?? item.title,
      purpose: item.clientPurpose,
      durationSeconds: item.durationSeconds,
      source: item.source,
      previewState: input.activeSceneId === item.itemId ? "active" : "ready",
    });
  }

  for (const item of input.timelineItems) {
    if (NARRATIVE_SCENE_ORDER.includes(item.slotType as (typeof NARRATIVE_SCENE_ORDER)[number])) {
      continue;
    }
    narrativeScenes.push({
      id: item.itemId,
      sceneKey: item.slotType,
      icon: getModuleIcon(item.slotType),
      title: SCENE_TITLES[item.slotType] ?? item.title,
      purpose: item.clientPurpose,
      durationSeconds: item.durationSeconds,
      source: item.source,
      previewState: input.activeSceneId === item.itemId ? "active" : "ready",
    });
  }

  return [goalScene, ...narrativeScenes];
}

export function formatExperienceDuration(seconds: number): string {
  if (seconds < 60) return `${seconds}s`;
  const minutes = Math.floor(seconds / 60);
  const remainder = seconds % 60;
  return remainder === 0 ? `${minutes} min` : `${minutes}:${String(remainder).padStart(2, "0")}`;
}

export function teachingStyleLabel(style: string): string {
  return style
    .replace(/-/g, " ")
    .replace(/\b\w/g, (char) => char.toUpperCase());
}
