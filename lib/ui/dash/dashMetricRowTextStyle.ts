import type { TextStyle } from "react-native";

import { UI_TEXT_PRIMARY, UI_TEXT_SECONDARY } from "@/lib/ui/theme/uiTokens";

/** Label typography for tappable metric rows on Dash cards (e.g. Daily Energy BMR / NEAT). */
export const dashMetricRowLabelTextStyle: TextStyle = {
  fontSize: 14,
  lineHeight: 20,
  color: UI_TEXT_SECONDARY,
  fontWeight: "500",
};

/** Value typography for tappable metric rows on Dash cards (e.g. Daily Energy factor kcal). */
export const dashMetricRowValueTextStyle: TextStyle = {
  fontSize: 15,
  lineHeight: 20,
  color: UI_TEXT_PRIMARY,
  fontWeight: "600",
  textAlign: "right",
};
