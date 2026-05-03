import { StyleSheet, type ViewStyle } from "react-native";

import { SYSTEM_ACCENT } from "@/lib/ui/theme/systemAccent";

/**
 * Horizontal inset from elevated training card edge to inner content (Program card body + overview
 * “This Week” combined card body). Must match {@link StrengthProgramCard} so Create Program and
 * This Week blue rows share the same left/right edges.
 */
export const PRIMARY_TRAINING_CARD_PADDING_HORIZONTAL = 14 as const;

/**
 * Pixel-identical shell for:
 * - Strength {@link StrengthProgramCard} “Create Program” pressable
 * - Workouts overview + Activity “This Week” value row containers
 *
 * Extracted from the Program card CTA — keep these values in one place only.
 */
/** Fixed border-box height: padding 12+12 + single line (lineHeight 20) = 44; caps This Week vs Create Program. */
export const PRIMARY_ACTION_BAR_SHELL_HEIGHT = 44 as const;

export const primaryActionContainerStyle: ViewStyle = {
  height: PRIMARY_ACTION_BAR_SHELL_HEIGHT,
  borderRadius: 10,
  backgroundColor: SYSTEM_ACCENT,
  paddingHorizontal: 16,
  paddingVertical: 12,
  overflow: "hidden",
};

export const programPrimaryCtaBarStyles = StyleSheet.create({
  /** Blue rounded rect; pair with {@link ctaBarCenterLayout} or {@link thisWeekRowLayout}. */
  primaryActionContainer: {
    ...primaryActionContainerStyle,
  },
  /** Create Program: centered label inside {@link primaryActionContainer}. */
  ctaBarCenterLayout: {
    justifyContent: "center",
    alignItems: "center",
  },
  /** This Week: horizontal row inside {@link primaryActionContainer} (no extra gap/padding vs CTA). */
  thisWeekRowLayout: {
    flexDirection: "row",
    alignItems: "center",
  },
  ctaBarLabel: {
    fontSize: 16,
    lineHeight: 20,
    fontWeight: "700",
    color: "#FFFFFF",
    letterSpacing: -0.2,
  },
  /**
   * This Week title column: flex lives on View (not Text) so row height matches Create Program
   * single-line metrics; inner Text uses {@link ctaBarLabel} only.
   */
  thisWeekRowTitleCell: {
    flex: 1,
    minWidth: 0,
    minHeight: 0,
    justifyContent: "center",
  },
  /** Trailing ••• — no minHeight/height; touch target uses hitSlop on the overview Pressable. */
  rowMenuBtn: {
    justifyContent: "center",
    alignItems: "center",
    marginLeft: 4,
    paddingHorizontal: 4,
  },
  rowMenuGlyph: {
    fontSize: 16,
    fontWeight: "700",
    color: "#FFFFFF",
    letterSpacing: -0.2,
  },
  /** Activity delta: same numeric weight as {@link ctaBarLabel} + tabular figures. */
  thisWeekRowTrailingNumeric: {
    fontVariant: ["tabular-nums"],
    flexShrink: 0,
  },
  ctaPressed: {
    opacity: 0.88,
  },
});
