import type { DifficultyLevel, TeachingStyle, VisualEmphasis } from "@/features/exercise-media-os/types";

export type FocusCardOption = {
  id: string;
  title: string;
  description: string;
  estimatedMinutes: number;
  icon: string;
  emphasis: VisualEmphasis;
};

export type TeachingStyleCardOption = {
  style: TeachingStyle;
  title: string;
  tonePreview: string;
  icon: string;
};

export type VisualEmphasisChipOption = {
  id: string;
  label: string;
  emphasis: VisualEmphasis;
  enablesSlowMotion?: boolean;
};

export type RoadmapCardOption = {
  id: string;
  title: string;
  description: string;
  icon: string;
};

const BASE_FOCUS_CARDS: FocusCardOption[] = [
  {
    id: "primary-focus",
    title: "Primary Activation",
    description: "Lead with the main muscles this exercise trains.",
    estimatedMinutes: 2,
    icon: "◎",
    emphasis: "primaryMuscles",
  },
  {
    id: "setup-focus",
    title: "Setup Precision",
    description: "Anchor the session on starting position and equipment.",
    estimatedMinutes: 2,
    icon: "⬚",
    emphasis: "setup",
  },
  {
    id: "tempo-focus",
    title: "Tempo",
    description: "Guide rep speed, pauses, and control through the set.",
    estimatedMinutes: 3,
    icon: "↔",
    emphasis: "tempo",
  },
  {
    id: "path-focus",
    title: "Bar Path",
    description: "Emphasize bar or limb path for safe, efficient reps.",
    estimatedMinutes: 2,
    icon: "↗",
    emphasis: "rangeOfMotion",
  },
  {
    id: "breathing-focus",
    title: "Breathing",
    description: "Coordinate breath with bracing and rep execution.",
    estimatedMinutes: 2,
    icon: "◌",
    emphasis: "breathing",
  },
  {
    id: "mistake-focus",
    title: "Control",
    description: "Highlight common mistakes and how to correct them.",
    estimatedMinutes: 3,
    icon: "△",
    emphasis: "commonMistake",
  },
];

const PRESS_FOCUS_CARDS: FocusCardOption[] = [
  {
    id: "chest-activation",
    title: "Chest Activation",
    description: "Open with upper-back setup and chest-driven pressing.",
    estimatedMinutes: 2,
    icon: "◆",
    emphasis: "primaryMuscles",
  },
  {
    id: "shoulder-stability",
    title: "Shoulder Stability",
    description: "Protect the shoulder while maintaining strong pressing lines.",
    estimatedMinutes: 2,
    icon: "◇",
    emphasis: "jointPath",
  },
  {
    id: "grip-focus",
    title: "Grip",
    description: "Stack wrists, engage the bar, and own the hand position.",
    estimatedMinutes: 2,
    icon: "✦",
    emphasis: "setup",
  },
  {
    id: "explosive-press",
    title: "Explosive Press",
    description: "Drive intent through the concentric with athletic tempo.",
    estimatedMinutes: 3,
    icon: "⚡",
    emphasis: "tempo",
  },
];

export const TEACHING_STYLE_CARDS: TeachingStyleCardOption[] = [
  {
    style: "simple",
    title: "Simple",
    tonePreview: "Clear, concise cues. Minimal jargon.",
    icon: "○",
  },
  {
    style: "technical",
    title: "Technical",
    tonePreview: "Precise mechanics and coaching detail.",
    icon: "◈",
  },
  {
    style: "scientific",
    title: "Scientific",
    tonePreview: "Evidence-led explanations and context.",
    icon: "△",
  },
  {
    style: "athletic",
    title: "Athletic",
    tonePreview: "Performance language and intent.",
    icon: "⚡",
  },
  {
    style: "motivational",
    title: "Motivational",
    tonePreview: "Encouraging, confidence-building delivery.",
    icon: "★",
  },
  {
    style: "rehab-aware",
    title: "Rehabilitation",
    tonePreview: "Conservative pacing and joint-friendly framing.",
    icon: "◌",
  },
];

export const VISUAL_EMPHASIS_CHIPS: VisualEmphasisChipOption[] = [
  { id: "muscles", label: "Muscles", emphasis: "primaryMuscles" },
  { id: "bar-path", label: "Bar Path", emphasis: "rangeOfMotion" },
  { id: "tempo", label: "Tempo", emphasis: "tempo" },
  { id: "grip", label: "Grip", emphasis: "setup" },
  { id: "breathing", label: "Breathing", emphasis: "breathing" },
  { id: "joint-motion", label: "Joint Motion", emphasis: "jointPath" },
  { id: "slow-motion", label: "Slow Motion", emphasis: "commonMistake", enablesSlowMotion: true },
];

export const DIFFICULTY_PILLS: { level: DifficultyLevel; label: string }[] = [
  { level: "beginner", label: "Beginner" },
  { level: "intermediate", label: "Intermediate" },
  { level: "advanced", label: "Advanced" },
  { level: "elite", label: "Elite" },
];

export const ROADMAP_CARDS: RoadmapCardOption[] = [
  {
    id: "ai-enhancement",
    title: "AI Enhancement",
    description: "Polish narration, captions, and lesson pacing automatically.",
    icon: "✦",
  },
  {
    id: "record-coach",
    title: "Record Coach Video",
    description: "Layer your voice and presence over Oli master footage.",
    icon: "▶",
  },
  {
    id: "upload-reference",
    title: "Upload Reference",
    description: "Attach reference clips to guide production or personalization.",
    icon: "↑",
  },
  {
    id: "publish-package",
    title: "Publish Package",
    description: "Ship the directed lesson to client delivery channels.",
    icon: "↗",
  },
];

const SLOT_MODULE_ICONS: Record<string, string> = {
  heroDemo: "▶",
  setup: "⬚",
  execution: "◎",
  slowMotion: "↔",
  commonMistake: "△",
  muscleOverlay: "◆",
  jointOverlay: "◇",
  frontAngle: "◧",
  sideAngle: "◨",
  closeUp: "⊕",
  coachIntro: "★",
  coachNote: "✎",
  reflection: "◌",
};

export function buildFocusCardsForExercise(exerciseName: string, primaryMuscles: string[]): FocusCardOption[] {
  const lower = exerciseName.toLowerCase();
  const muscles = primaryMuscles.join(" ").toLowerCase();
  const isPress =
    lower.includes("press") ||
    lower.includes("bench") ||
    muscles.includes("chest") ||
    muscles.includes("shoulder");

  if (isPress) {
    return [...PRESS_FOCUS_CARDS, ...BASE_FOCUS_CARDS.filter((card) => card.id === "breathing-focus")];
  }

  return BASE_FOCUS_CARDS;
}

export function getModuleIcon(slotType: string): string {
  return SLOT_MODULE_ICONS[slotType] ?? "•";
}

export function formatLessonDuration(seconds: number): string {
  if (seconds < 60) return `${seconds}s`;
  const minutes = Math.floor(seconds / 60);
  const remainder = seconds % 60;
  return remainder === 0 ? `${minutes} min` : `${minutes} min ${remainder}s`;
}

export function timelineDisplayTitle(title: string, slotType: string): string {
  if (slotType === "commonMistake") return "Mistake";
  if (slotType === "muscleOverlay" || slotType === "jointOverlay") return "Overlay";
  if (title === "Coach Intro (Custom)" || slotType === "coachIntro") return "Coach Intro";
  return title.replace(/\s*\(.*\)$/, "");
}

export function readinessStars(score: number): number {
  if (score >= 90) return 5;
  if (score >= 75) return 4;
  if (score >= 60) return 3;
  if (score >= 40) return 2;
  return 1;
}

export function readinessLabel(score: number): string {
  if (score >= 90) return "Ready";
  if (score >= 75) return "Polished";
  if (score >= 60) return "Planned";
  return "In Production";
}

export const COACH_MESSAGE_MAX = 280;
