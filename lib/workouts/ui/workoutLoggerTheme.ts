/**
 * Shared visual + typography tokens for workout log and related surfaces
 * (bottom bar, block sheets, delete confirm, finish/cancel sheets, draft picker, etc.).
 */
import { Platform, StyleSheet, type TextStyle, type ViewStyle } from "react-native";
import { SYSTEM_ACCENT } from "@/lib/ui/theme/systemAccent";

export const WORKOUT_LOGGER_COLORS = {
  pageBackground: "#F2F2F7",
  /** Grouped / “premium” sheets (add block, edit block, delete confirm). */
  sheetChromeBackground: "#F2F2F7",
  sheetSurface: "#FFFFFF",
  sheetBackdrop: "rgba(0,0,0,0.35)",
  textPrimary: "#1C1C1E",
  textSecondary: "#8E8E93",
  textSecondaryMuted: "#6E6E73",
  grabber: "#C7C7CC",
  destructive: "#FF3B30",
} as const;

export const WORKOUT_LOGGER_LAYOUT = {
  sheetTopRadius: 22,
  sheetHorizontalPadding: 20,
  optionCardRadius: 16,
  destructiveButtonRadius: 14,
  cancelOutlineRadius: 14,
} as const;

/** Bottom command bar frosted capsule (log screen only). */
export const WORKOUT_LOGGER_BOTTOM_BAR = {
  backgroundColor: "rgba(255, 255, 255, 0.56)",
  borderRadius: 38,
} as const;

export function workoutLoggerBottomBarShadow(): ViewStyle {
  return Platform.select<ViewStyle>({
    ios: {
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.05,
      shadowRadius: 12,
    },
    default: { elevation: 2 },
  });
}

/** Grabber pill — shared across logger sheets + rest timer panel. */
export const workoutLoggerGrabberStyle: ViewStyle = {
  alignSelf: "center",
  width: 36,
  height: 4,
  borderRadius: 2,
  backgroundColor: WORKOUT_LOGGER_COLORS.grabber,
  marginBottom: 12,
};

export function workoutLoggerOptionCardShadow(): ViewStyle {
  return Platform.select<ViewStyle>({
    ios: {
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.05,
      shadowRadius: 4,
    },
    default: { elevation: 1 },
  });
}

export const workoutLoggerOptionCardCurrent: ViewStyle = {
  borderColor: SYSTEM_ACCENT,
  backgroundColor: "rgba(58, 91, 219, 0.07)",
};

export const workoutLoggerTypography: {
  pageTimer: TextStyle;
  sheetTitle: TextStyle;
  sheetBody: TextStyle;
  optionTitle: TextStyle;
  optionDescription: TextStyle;
  commandBarLabel: TextStyle;
  sectionChip: TextStyle;
  sectionEyebrow: TextStyle;
  /** Expanded exercise logger — title row */
  exerciseInlineTitle: TextStyle;
  /** Logged / draft set primary line */
  exerciseSetRowPrimary: TextStyle;
  /** RPE / secondary cues on set rows */
  exerciseSetRowMeta: TextStyle;
  /** Tappable draft field value */
  exerciseInlineFieldValue: TextStyle;
  /** Draft field placeholder label */
  exerciseInlineFieldLabel: TextStyle;
  /** + Set / History pill label */
  exerciseActionPillLabel: TextStyle;
} = {
  pageTimer: {
    fontSize: 21,
    fontWeight: "600",
    fontVariant: ["tabular-nums"],
    color: WORKOUT_LOGGER_COLORS.textPrimary,
    letterSpacing: -0.22,
  },

  sheetTitle: {
    fontSize: 24,
    fontWeight: "700",
    color: WORKOUT_LOGGER_COLORS.textPrimary,
    letterSpacing: -0.4,
  },

  sheetBody: {
    fontSize: 16,
    fontWeight: "400",
    color: WORKOUT_LOGGER_COLORS.textSecondary,
    lineHeight: 24,
    letterSpacing: -0.18,
  },

  optionTitle: {
    fontSize: 17,
    fontWeight: "600",
    color: WORKOUT_LOGGER_COLORS.textPrimary,
    letterSpacing: -0.22,
  },

  optionDescription: {
    fontSize: 15,
    fontWeight: "400",
    color: WORKOUT_LOGGER_COLORS.textSecondary,
    lineHeight: 22,
    letterSpacing: -0.15,
  },

  commandBarLabel: {
    fontSize: 13,
    fontWeight: "500",
    color: "#3C3C43",
    letterSpacing: -0.15,
  },

  sectionChip: {
    fontSize: 12,
    fontWeight: "600",
    color: WORKOUT_LOGGER_COLORS.textSecondary,
    letterSpacing: 0.6,
  },

  sectionEyebrow: {
    fontSize: 12,
    fontWeight: "600",
    color: WORKOUT_LOGGER_COLORS.textSecondary,
    letterSpacing: 0.6,
    textTransform: "uppercase",
  },

  exerciseInlineTitle: {
    fontSize: 17,
    fontWeight: "600",
    color: WORKOUT_LOGGER_COLORS.textPrimary,
    letterSpacing: -0.22,
  },

  exerciseSetRowPrimary: {
    fontSize: 15,
    fontWeight: "600",
    color: WORKOUT_LOGGER_COLORS.textPrimary,
    letterSpacing: -0.18,
  },

  exerciseSetRowMeta: {
    fontSize: 14,
    fontWeight: "400",
    color: WORKOUT_LOGGER_COLORS.textSecondary,
    letterSpacing: -0.15,
  },

  exerciseInlineFieldValue: {
    fontSize: 16,
    fontWeight: "600",
    color: WORKOUT_LOGGER_COLORS.textPrimary,
    letterSpacing: -0.2,
  },

  exerciseInlineFieldLabel: {
    fontSize: 14,
    fontWeight: "500",
    color: WORKOUT_LOGGER_COLORS.textSecondary,
    letterSpacing: -0.15,
  },

  exerciseActionPillLabel: {
    fontSize: 15,
    fontWeight: "600",
    letterSpacing: -0.18,
  },
};

export const workoutLoggerDestructivePrimary: ViewStyle = {
  alignSelf: "stretch",
  paddingVertical: 16,
  borderRadius: WORKOUT_LOGGER_LAYOUT.destructiveButtonRadius,
  backgroundColor: WORKOUT_LOGGER_COLORS.destructive,
  alignItems: "center",
  borderWidth: StyleSheet.hairlineWidth,
  borderColor: "rgba(0, 0, 0, 0.08)",
};

export const workoutLoggerDestructivePrimaryText: TextStyle = {
  fontSize: 17,
  fontWeight: "700",
  color: "#FFFFFF",
  letterSpacing: -0.22,
};

export const workoutLoggerCancelOutline: ViewStyle = {
  marginTop: 12,
  alignSelf: "stretch",
  paddingVertical: 14,
  alignItems: "center",
  justifyContent: "center",
  borderRadius: WORKOUT_LOGGER_LAYOUT.cancelOutlineRadius,
  borderWidth: StyleSheet.hairlineWidth,
  borderColor: "rgba(60, 60, 67, 0.22)",
  backgroundColor: WORKOUT_LOGGER_COLORS.sheetSurface,
};

export const workoutLoggerCancelOutlineText: TextStyle = {
  fontSize: 16,
  fontWeight: "600",
  color: "#3C3C43",
  letterSpacing: -0.2,
};

export const workoutLoggerCancelTextButton: TextStyle = {
  fontSize: 17,
  fontWeight: "600",
  color: WORKOUT_LOGGER_COLORS.textSecondary,
  letterSpacing: -0.2,
};
