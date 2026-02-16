// components/calendar/DayPill.tsx
import { Pressable, View, StyleSheet } from "react-native";
import { Text } from "../../lib/ui/Text";

type Props = {
  label: string;        // "Sun"
  ymd: string;          // "2025-09-06"
  isToday?: boolean;    // text turns red
  isSelected?: boolean; // subtle bg
  hasLog?: boolean;     // neon ring if true, dormant if false
  onPress?: () => void;
};

const COLORS = {
  neon: "#39FF14",        // active ring
  dormant: "#D1D5DB",     // neutral ring
  todayRed: "#EF4444",    // today's date text color
  textDefault: "#111827",
  selectedBg: "#F3F4F6",
  ringBg: "#FFFFFF",
};

export default function DayPill({
  label,
  ymd,
  isToday,
  isSelected,
  hasLog,
  onPress,
}: Props) {
  const ringColor = hasLog ? COLORS.neon : COLORS.dormant;
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`${label} ${ymd}${hasLog ? " has logs" : ""}${isToday ? ", today" : ""}`}
      style={[styles.wrap, isSelected && { backgroundColor: COLORS.selectedBg }]}
      hitSlop={8}
    >
      <Text size="sm" align="center" style={{ color: isToday ? COLORS.todayRed : COLORS.textDefault }}>
        {label}
      </Text>
      <View style={[styles.ring, { borderColor: ringColor }]}>
        <View style={[styles.inner, { backgroundColor: COLORS.ringBg }]}>
          <Text align="center">{ymd.slice(8, 10)}</Text>
        </View>
      </View>
    </Pressable>
  );
}

const SIZE = 34; // slightly smaller so 7 fit comfortably in narrow devices

const styles = StyleSheet.create({
  wrap: {
    alignItems: "center",
    paddingVertical: 6,
    borderRadius: 12,
  },
  ring: {
    width: SIZE,
    height: SIZE,
    borderRadius: SIZE / 2,
    borderWidth: 3,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 4,
  },
  inner: {
    width: SIZE - 10,
    height: SIZE - 10,
    borderRadius: (SIZE - 10) / 2,
    alignItems: "center",
    justifyContent: "center",
  },
});
