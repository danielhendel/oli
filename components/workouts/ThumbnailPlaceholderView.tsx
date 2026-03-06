/**
 * Neutral placeholder for exercise thumbnail when no image asset is available.
 * Used in picker rows and collapsed logger rows to avoid black placeholder images.
 */

import React, { memo } from "react";
import { View, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";

type ThumbnailPlaceholderViewProps = {
  /** Width and height in logical pixels. Default 44 to match legacy square row thumbnails. */
  size?: number;
  /** Optional landscape dimensions; when set, overrides size (used for row thumbnails). */
  width?: number;
  height?: number;
};

const DEFAULT_SIZE = 44;

function ThumbnailPlaceholderViewInner({ size = DEFAULT_SIZE, width: w, height: h }: ThumbnailPlaceholderViewProps) {
  const width = w ?? size;
  const height = h ?? size;
  const iconSize = Math.max(20, Math.floor(Math.min(width, height) * 0.45));
  return (
    <View style={[styles.placeholder, { width, height }]} accessibilityLabel="Exercise placeholder">
      <Ionicons name="barbell-outline" size={iconSize} color="#8E8E93" />
    </View>
  );
}

export const ThumbnailPlaceholderView = memo(ThumbnailPlaceholderViewInner);

const styles = StyleSheet.create({
  placeholder: {
    backgroundColor: "#E5E5EA",
    borderRadius: 6,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "#C6C6C8",
    justifyContent: "center",
    alignItems: "center",
  },
});
