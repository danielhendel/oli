import React from "react";
import { View, Pressable, StyleSheet } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Text } from "../../lib/ui/Text";

type Props = {
  ymd: string;           // local YYYY-MM-DD
  onPrev?: () => void;
  onNext?: () => void;
};

function formatLocal(ymd: string): string {
  const [ys, ms, ds] = ymd.split("-");
  const y = Number(ys);
  const m = Number(ms);
  const d = Number(ds);
  const dt = new Date(y, m - 1, d);
  return dt.toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" });
}

/** Full-bleed sticky header that fills left/right and respects the notch. */
export function DayToolbar({ ymd, onPrev, onNext }: Props) {
  const insets = useSafeAreaInsets();
  return (
    <View style={[styles.wrap, { paddingTop: insets.top }]}>
      <View style={styles.row}>
        <Pressable accessibilityRole="button" accessibilityLabel="Previous day" hitSlop={12} onPress={onPrev} style={styles.side}>
          <Text size="xl">‹</Text>
        </Pressable>

        <Text size="xl" weight="medium" align="center" style={styles.title}>
          {formatLocal(ymd)}
        </Text>

        <Pressable accessibilityRole="button" accessibilityLabel="Next day" hitSlop={12} onPress={onNext} style={styles.side}>
          <Text size="xl">›</Text>
        </Pressable>
      </View>
      <View style={styles.divider} />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    backgroundColor: "#fff",
    // bleed to screen edges even if parent content uses 16px padding
    marginHorizontal: -16,
    paddingHorizontal: 16,
  },
  row: {
    paddingVertical: 10,
    flexDirection: "row",
    alignItems: "center",
  },
  side: { width: 40, alignItems: "center" },
  title: { flex: 1 },
  divider: { height: StyleSheet.hairlineWidth, backgroundColor: "rgba(0,0,0,0.08)" },
});
