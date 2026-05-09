import { StyleSheet } from "react-native";

import { WORKOUTS_SCREEN_CONTENT_BG } from "@/lib/ui/headers/workoutsStackHeader";
import { UI_BORDER_SUBTLE, UI_CARD_SURFACE, UI_TEXT_PRIMARY, UI_TEXT_SECONDARY, UI_TEXT_TERTIARY_LABEL } from "@/lib/ui/theme/uiTokens";

/** Shared modal body chrome for Strength/Cardio range explainer screens (presentation-only). */
export const rangeExplainerSheetStyles = StyleSheet.create({
  scroll: {
    flex: 1,
    backgroundColor: WORKOUTS_SCREEN_CONTENT_BG,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 28,
    gap: 16,
  },
  lead: {
    fontSize: 15,
    lineHeight: 21,
    fontWeight: "400",
    color: UI_TEXT_SECONDARY,
    letterSpacing: -0.2,
  },
  legendSection: {
    backgroundColor: UI_CARD_SURFACE,
    borderRadius: 12,
    padding: 14,
    gap: 0,
  },
  legendHeading: {
    fontSize: 17,
    fontWeight: "600",
    color: UI_TEXT_PRIMARY,
    letterSpacing: -0.28,
    marginBottom: 12,
  },
  metricExplainerBlock: {
    gap: 10,
  },
  structuredCardsWrap: {
    gap: 12,
  },
  metricExplainerTitle: {
    fontSize: 17,
    fontWeight: "600",
    color: UI_TEXT_PRIMARY,
    letterSpacing: -0.28,
  },
  metricExplainerParagraph: {
    fontSize: 15,
    lineHeight: 22,
    fontWeight: "400",
    color: UI_TEXT_SECONDARY,
    letterSpacing: -0.18,
  },
  sectionHeading: {
    fontSize: 17,
    fontWeight: "600",
    color: UI_TEXT_PRIMARY,
    letterSpacing: -0.28,
    marginTop: 4,
  },
  tierBlock: {
    gap: 4,
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: UI_BORDER_SUBTLE,
  },
  tierTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: UI_TEXT_PRIMARY,
    letterSpacing: -0.26,
  },
  tierRange: {
    fontSize: 13,
    fontWeight: "500",
    color: UI_TEXT_TERTIARY_LABEL,
    letterSpacing: -0.08,
  },
  tierBody: {
    fontSize: 14,
    lineHeight: 19,
    fontWeight: "400",
    color: UI_TEXT_SECONDARY,
    letterSpacing: -0.12,
    marginTop: 2,
  },
  personalCard: {
    marginTop: 8,
    backgroundColor: UI_CARD_SURFACE,
    borderRadius: 12,
    padding: 14,
    gap: 6,
  },
  personalHeading: {
    fontSize: 13,
    fontWeight: "600",
    color: UI_TEXT_TERTIARY_LABEL,
    letterSpacing: -0.08,
    textTransform: "uppercase",
  },
  personalLine: {
    fontSize: 16,
    fontWeight: "500",
    color: UI_TEXT_PRIMARY,
    letterSpacing: -0.26,
  },
  personalEmphasis: {
    fontWeight: "700",
  },
  personalValue: {
    fontSize: 15,
    lineHeight: 20,
    fontWeight: "400",
    color: UI_TEXT_SECONDARY,
    letterSpacing: -0.15,
    fontVariant: ["tabular-nums"],
  },
});
