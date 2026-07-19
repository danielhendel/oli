// lib/ui/timeline/TimelineCalendarButton.tsx
import { Pressable } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useOliColorTheme } from "@/lib/ui/theme/OliColorContext";

const HIT_SLOP = { top: 12, bottom: 12, left: 12, right: 12 };
const PADDING = 8;
const ICON_SIZE = 24;

export type TimelineCalendarButtonProps = {
  onPress: () => void;
};

/** 44×44 calendar control replacing Settings gear on Timeline. */
export function TimelineCalendarButton({ onPress }: TimelineCalendarButtonProps) {
  const { mode, colors } = useOliColorTheme();
  const iconColor = mode === "dark" ? "#FFFFFF" : colors.textPrimary;

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => ({
        padding: PADDING,
        minWidth: 44,
        minHeight: 44,
        alignItems: "center",
        justifyContent: "center",
        opacity: pressed ? 0.65 : 1,
      })}
      hitSlop={HIT_SLOP}
      accessibilityLabel="Open timeline calendar"
      accessibilityRole="button"
      testID="timeline-calendar-button"
    >
      <Ionicons
        name="calendar-outline"
        size={ICON_SIZE}
        color={iconColor}
        testID="timeline-calendar-icon"
      />
    </Pressable>
  );
}
