// Shared Settings gear button for tab pages — navigates to Settings.
import { Pressable } from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";

const HIT_SLOP = { top: 12, bottom: 12, left: 12, right: 12 };
const PADDING = 8;
const ICON_SIZE = 24;
const ICON_COLOR = "#1C1C1E";

export function SettingsGearButton() {
  const router = useRouter();
  return (
    <Pressable
      onPress={() => router.push("/(app)/settings")}
      style={{ padding: PADDING }}
      hitSlop={HIT_SLOP}
      accessibilityLabel="Settings"
      accessibilityRole="button"
    >
      <Ionicons name="settings-outline" size={ICON_SIZE} color={ICON_COLOR} />
    </Pressable>
  );
}
