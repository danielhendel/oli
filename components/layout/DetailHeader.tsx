import React from "react";
import { View, StyleSheet } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Text } from "../../lib/ui/Text";

type Props = {
  title: string;
  onBack: () => void;
  right?: React.ReactNode; // optional trailing control
};

export default function DetailHeader({ title, onBack, right }: Props) {
  return (
    <SafeAreaView edges={["top", "left", "right"]} style={styles.safe}>
      <View style={styles.bar} accessibilityRole="header">
        <Text
          onPress={onBack}
          size="xl"
          accessibilityRole="button"
          accessibilityLabel="Back"
          style={{ width: 40 }}
        >
          ‹
        </Text>
        <Text size="xl" weight="medium" align="center" style={{ flex: 1 }} numberOfLines={1}>
          {title}
        </Text>
        <View style={{ width: 40, alignItems: "flex-end" }}>{right ?? null}</View>
      </View>
      <View style={styles.divider} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { backgroundColor: "#fff" },
  bar: {
    height: 44,                // ↓ 56 -> 44 for tighter iOS look
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,     // ↓ 16 -> 12 to reclaim vertical room visually
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: "rgba(0,0,0,0.06)",
  },
});
