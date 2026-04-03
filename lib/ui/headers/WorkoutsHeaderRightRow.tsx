import React from "react";
import { View, StyleSheet } from "react-native";

type WorkoutsHeaderRightRowProps = {
  children: React.ReactNode;
  /** Default 12; use 8–10 to tighten grouped icon + overflow (e.g. Body module). */
  gap?: number;
};

/** Consistent trailing actions layout for workouts stack headers (overview, history, etc.). */
export function WorkoutsHeaderRightRow({ children, gap = 12 }: WorkoutsHeaderRightRowProps) {
  return <View style={[styles.row, { gap }]}>{children}</View>;
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    paddingRight: 16,
  },
});
