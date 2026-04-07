// Shared subtle border + platform shadow for white cards on grouped sheets (e.g. Dash).
import { Platform, type ViewStyle } from "react-native";
import { UI_CARD_ELEVATED_BORDER } from "@/lib/ui/theme/uiTokens";

function elevatedShadowStyle(): ViewStyle {
  const os = typeof Platform !== "undefined" && Platform.OS != null ? Platform.OS : "ios";
  if (os === "ios") {
    return {
      shadowColor: "#000000",
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.05,
      shadowRadius: 8,
    };
  }
  if (os === "android") {
    return { elevation: 2 };
  }
  return {};
}

export const elevatedCardSurfaceStyle: ViewStyle = {
  borderWidth: 1,
  borderColor: UI_CARD_ELEVATED_BORDER,
  ...elevatedShadowStyle(),
};
