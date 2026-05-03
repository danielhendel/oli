// Shared subtle border + platform shadow for elevated cards on grouped sheets (e.g. Dash).
import { Platform, type ViewStyle } from "react-native";
import { UI_CARD_ELEVATED_BORDER, UI_CARD_SURFACE } from "@/lib/ui/theme/uiTokens";
import { OLI_DARK } from "@/lib/ui/theme/oliSemantic";

function elevatedShadowStyle(): ViewStyle {
  const os = typeof Platform !== "undefined" && Platform.OS != null ? Platform.OS : "ios";
  if (os === "ios") {
    return {
      shadowColor: OLI_DARK.shadowColor,
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.28,
      shadowRadius: 10,
    };
  }
  if (os === "android") {
    return { elevation: 2 };
  }
  return {};
}

/** Default elevated card fill — dark card surface; callers should not repeat `backgroundColor: UI_CARD_SURFACE`. */
export const elevatedCardSurfaceStyle: ViewStyle = {
  backgroundColor: UI_CARD_SURFACE,
  borderWidth: 1,
  borderColor: UI_CARD_ELEVATED_BORDER,
  ...elevatedShadowStyle(),
};
