import React from "react";
import { View, StyleSheet, ViewProps } from "react-native";

type Props = ViewProps & { children: React.ReactNode };

/** Height we reserve below scroll content so the bar never overlaps it. */
export const STICKY_BAR_INSET = 92;

/** A generic sticky bar you can drop into any screen. */
export default function StickyBottomBar({ children, style, ...rest }: Props) {
  return (
    <View pointerEvents="box-none" style={[styles.bar, style]} {...rest}>
      <View style={styles.inner}>{children}</View>
    </View>
  );
}

/** App-standard “light gray” ghost button styling used for Close. */
export const stickyBarGhostButtonStyle = {
  backgroundColor: "#F3F4F6",
  borderWidth: 1,
  borderColor: "#E5E7EB",
  paddingVertical: 12,
  borderRadius: 14,
};

const styles = StyleSheet.create({
  bar: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(255,255,255,0.98)",
    paddingHorizontal: 24,
    paddingTop: 8,
    paddingBottom: 20, // above the home indicator
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: "rgba(0,0,0,0.08)",
    shadowColor: "#000",
    shadowOpacity: 0.08,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: -4 },
    elevation: 8,
  },
  inner: { width: "100%", maxWidth: 520, alignSelf: "center" },
});
