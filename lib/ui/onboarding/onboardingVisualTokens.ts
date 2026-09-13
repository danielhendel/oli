// lib/ui/onboarding/onboardingVisualTokens.ts
/**
 * Restrained Stage 2 onboarding accents — builds on SYSTEM_ACCENT / dark canvas.
 * Not a separate design language; additive atmosphere for first-use screens.
 */

import { SYSTEM_ACCENT, SYSTEM_ACCENT_FILL_14, SYSTEM_ACCENT_TILE_WASH } from "@/lib/ui/theme/systemAccent";
import {
  UI_APP_SCREEN_BG,
  UI_BORDER_HAIRLINE,
  UI_CARD_SURFACE,
  UI_TEXT_MUTED,
  UI_TEXT_PRIMARY,
  UI_TEXT_SECONDARY,
} from "@/lib/ui/theme/uiTokens";

export const ONBOARDING_VISUAL = {
  canvas: UI_APP_SCREEN_BG,
  card: UI_CARD_SURFACE,
  border: UI_BORDER_HAIRLINE,
  textPrimary: UI_TEXT_PRIMARY,
  textSecondary: UI_TEXT_SECONDARY,
  textMuted: UI_TEXT_MUTED,
  accent: SYSTEM_ACCENT,
  accentWash: SYSTEM_ACCENT_TILE_WASH,
  accentSoft: SYSTEM_ACCENT_FILL_14,
  /** Soft cyan depth behind hero — not a second brand. */
  glowCyan: "rgba(56, 189, 248, 0.14)",
  glowIndigo: "rgba(58, 91, 219, 0.22)",
  glowViolet: "rgba(124, 92, 255, 0.12)",
  appleAccent: "rgba(255, 89, 94, 0.22)",
  appleAccentBorder: "rgba(255, 120, 120, 0.35)",
  ouraAccent: "rgba(124, 92, 255, 0.22)",
  ouraAccentBorder: "rgba(160, 140, 255, 0.35)",
  primaryButton: SYSTEM_ACCENT,
  secondaryBorder: "rgba(255,255,255,0.16)",
  progressTrack: "rgba(255,255,255,0.12)",
  progressFill: SYSTEM_ACCENT,
  inputFocusBorder: SYSTEM_ACCENT,
  radiusLg: 18,
  radiusMd: 14,
  radiusSm: 12,
  minTap: 44,
} as const;
