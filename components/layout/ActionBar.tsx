// components/layout/ActionBar.tsx
import React from "react";
import { View, StyleSheet } from "react-native";
import Button from "../../lib/ui/Button";

export type ActionSpec = {
  label: string;
  onPress: () => void;
  variant?: "primary" | "secondary" | "ghost";
  // For destructive, just pass variant="ghost" and set label accordingly in callers for clarity.
};

type Props = {
  left?: ActionSpec[];
  right?: ActionSpec[];
  bottomInset?: number; // extra padding for very tall screens if desired
};

export default function ActionBar({ left = [], right = [], bottomInset = 0 }: Props) {
  return (
    <View style={[styles.wrap, bottomInset ? { paddingBottom: 20 + bottomInset } : null]}>
      <View style={styles.inner}>
        <View style={styles.row}>
          <View style={styles.side}>
            {left.map((b, i) => (
              <Button key={`l-${i}`} label={b.label} onPress={b.onPress} variant={b.variant ?? "ghost"} />
            ))}
          </View>
          <View style={styles.side}>
            {right.map((b, i) => (
              <Button key={`r-${i}`} label={b.label} onPress={b.onPress} variant={b.variant ?? "secondary"} />
            ))}
          </View>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(255,255,255,0.98)",
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 20,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: "rgba(0,0,0,0.08)",
    shadowColor: "#000",
    shadowOpacity: 0.08,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: -4 },
    elevation: 8,
  },
  inner: { width: "100%", maxWidth: 640, alignSelf: "center" },
  row: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 12 },
  side: { flexDirection: "row", gap: 8, alignItems: "center" },
});
