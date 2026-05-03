import type { TextStyle, ViewStyle } from "react-native";

import { elevatedCardSurfaceStyle } from "@/lib/ui/theme/elevatedCardSurface";
import { UI_CARD_SURFACE, UI_TEXT_PRIMARY } from "@/lib/ui/theme/uiTokens";

/**
 * Primary title typography for Strength metric cards ({@link StrengthFrequencyMetricCard}).
 * Shared so Strength Analytics yearly chart can align with Strength Baseline without duplicating literals.
 */
export const strengthMetricCardTitleTextStyle: TextStyle = {
  flexShrink: 1,
  minWidth: 0,
  fontSize: 19,
  lineHeight: 24,
  fontWeight: "600",
  color: UI_TEXT_PRIMARY,
  letterSpacing: -0.34,
};

/** Elevated shell aligned with Strength Baseline card (radius, padding, hairline border, shadow). Use where inner sections already manage vertical spacing. */
export const strengthYearlyAnalyticsCardShellStyle: ViewStyle = {
  backgroundColor: UI_CARD_SURFACE,
  borderRadius: 12,
  padding: 15,
  ...elevatedCardSurfaceStyle,
};
