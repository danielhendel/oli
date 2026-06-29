import type {
  MediaAssetKind,
  MediaSlot,
  MediaSlotStatus,
  MediaVisualTreatment,
} from "@/features/exercise-media-os/types";

export function formatAssetKindLabel(assetKind: MediaAssetKind | undefined): string {
  switch (assetKind) {
    case "placeholder-video":
      return "Video";
    case "placeholder-overlay":
      return "Overlay";
    case "placeholder-narration":
      return "Narration";
    default:
      return "Media";
  }
}

export function formatVisualTreatmentLabel(
  treatment: MediaVisualTreatment | undefined,
): string {
  switch (treatment) {
    case "cinematic":
      return "Cinematic";
    case "slow-motion":
      return "Slow Motion";
    case "anatomy-overlay":
      return "Anatomy";
    case "coach-intro":
      return "Coach Intro";
    case "lesson-card":
      return "Lesson Card";
    default:
      return "Standard";
  }
}

export function formatSlotStatusLabel(status: MediaSlotStatus): string {
  switch (status) {
    case "approved":
      return "Ready";
    case "planned":
      return "Planned";
    case "reviewed":
      return "Reviewed";
    case "draft":
      return "Draft";
    default:
      return "Missing";
  }
}

export function resolveSlotForSceneKey(
  slots: MediaSlot[],
  sceneKey: string,
): MediaSlot | undefined {
  return slots.find((slot) => slot.slotType === sceneKey);
}

export function mediaSlotThemeClass(visualTheme: string | undefined): string {
  if (!visualTheme) return "themeDefault";
  return `theme_${visualTheme.replace(/[^a-z0-9]+/gi, "_")}`;
}
