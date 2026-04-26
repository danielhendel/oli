/**
 * Layout tokens for workout log expanded exercise hero media (single source of truth + tests).
 * No full-width gray band: transparent wrapper; thumbnail draws its own surface.
 */
export const WORKOUT_LOG_HERO_MEDIA_CONTAINER = {
  width: "100%" as const,
  maxHeight: 196,
  backgroundColor: "transparent" as const,
  overflow: "hidden" as const,
  alignItems: "stretch" as const,
};
