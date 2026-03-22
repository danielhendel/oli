import React from "react";
import { View, StyleSheet } from "react-native";

/** Consistent trailing actions layout for workouts stack headers (overview, history, etc.). */
export function WorkoutsHeaderRightRow({ children }: { children: React.ReactNode }) {
  return <View style={styles.row}>{children}</View>;
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingRight: 16,
  },
});
