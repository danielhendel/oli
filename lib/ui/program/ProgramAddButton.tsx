// Program tab header action: replaces the Settings gear with a "+" that opens the Program Builder hub.
// Mirrors SettingsGearButton chrome (size, hit target) but uses the white primary-text token so the
// glyph reads clearly on the dark tab-root background.
import { Pressable } from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";

import { UI_TEXT_PRIMARY } from "@/lib/ui/theme/uiTokens";

const HIT_SLOP = { top: 12, bottom: 12, left: 12, right: 12 };
const PADDING = 8;
const ICON_SIZE = 26;
/** White on the dark tab-root background (OLI_DARK textPrimary = #F7F8FA). */
const ICON_COLOR = UI_TEXT_PRIMARY;

export function ProgramAddButton() {
  const router = useRouter();
  return (
    <Pressable
      testID="program-add-button"
      onPress={() => router.push("/(app)/program/builder")}
      style={{ padding: PADDING }}
      hitSlop={HIT_SLOP}
      accessibilityLabel="Open program builder"
      accessibilityRole="button"
    >
      <Ionicons name="add" size={ICON_SIZE} color={ICON_COLOR} />
    </Pressable>
  );
}
