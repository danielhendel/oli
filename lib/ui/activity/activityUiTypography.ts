import type { TextStyle } from "react-native";

import { UI_TEXT_PRIMARY, UI_TEXT_SECONDARY } from "@/lib/ui/theme/uiTokens";

/** Shared Activity screen — quieter pills vs dominant numeric figures (steps). */
export const ACTIVITY_DETAILS_SUBTLE_PILL_LABEL_TYPOGRAPHY = {
  fontSize: 11,
  fontWeight: "600" as const,
  letterSpacing: -0.05,
};

/**
 * Large tabular numeric for Activity overview metrics — matches Today card steps figure
 * ({@link ActivityTodayCard} `stepsFigure`).
 */
export const ACTIVITY_OVERVIEW_LARGE_METRIC_FIGURE_STYLE: TextStyle = {
  fontSize: 23,
  lineHeight: 28,
  fontWeight: "600",
  fontVariant: ["tabular-nums"],
  color: UI_TEXT_PRIMARY,
  letterSpacing: -0.44,
};

/** Secondary qualifier beside a large Activity metric (e.g. “avg steps per day”). */
export const ACTIVITY_OVERVIEW_METRIC_QUALIFIER_STYLE: TextStyle = {
  fontSize: 15,
  lineHeight: 20,
  fontWeight: "500",
  color: UI_TEXT_SECONDARY,
  letterSpacing: -0.15,
};

export const ACTIVITY_OVERVIEW_SUBTLE_PILL_LABEL_TYPOGRAPHY = ACTIVITY_DETAILS_SUBTLE_PILL_LABEL_TYPOGRAPHY;
