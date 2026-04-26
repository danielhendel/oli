/**
 * Exercise still thumbnail: remote URL, bundled asset, or placeholder.
 * Real media: white inset frame, balanced padding, resizeMode "contain" (no crop).
 * Placeholder uses the same outer frame as real media (picker / log consistency).
 * Failed loads fall back to the placeholder frame (no empty/black Image).
 */

import React, { memo, useCallback, useEffect, useMemo, useState } from "react";
import { View, Image, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";

export type ExerciseMediaThumbnailSize = "row" | "card" | "preview";

/** Row: compact near-square (picker / log list) — more image fill, less horizontal gutter vs 16:9. */
const ROW_W = 84;
const ROW_H = 84;
/** Card: workout log expanded hero (capped height, no full-width gray slab). */
const CARD_H = 192;
/** Preview: edit screen (fixed height within 220–260pt band). */
const PREVIEW_H = 228;

/** Same frame for real media and placeholder (workout logger / picker consistency). */
const MEDIA_SURFACE = "#FFFFFF";
const MEDIA_BORDER = "#E8E8ED";
const PLACEHOLDER_SURFACE = MEDIA_SURFACE;
const PLACEHOLDER_BORDER = MEDIA_BORDER;
/** Inner padding for real media: row tighter; card/preview unchanged. */
const INNER_PAD_MEDIA_ROW = 4;
const INNER_PAD_MEDIA_DEFAULT = 8;
const OUTER_RADIUS = 12;

export type ExerciseMediaThumbnailProps = {
  /** Remote / uploaded image URL */
  imageUrl?: string;
  /** Metro numeric asset from require() for bundled catalog thumbnails */
  bundledSource?: number;
  size: ExerciseMediaThumbnailSize;
  accessibilityLabel: string;
  style?: object;
  /** For tests / a11y tooling */
  testID?: string;
  /** Invoked when remote or bundled Image fails to load (decoding, 404, corrupt asset). */
  onLoadError?: () => void;
  accessibilityHint?: string;
  /** When a parent Pressable provides the screen-reader affordance (e.g. add image). */
  accessibilityElementsHidden?: boolean;
};

function placeholderIconSize(size: ExerciseMediaThumbnailSize): number {
  if (size === "row") return 20;
  if (size === "card") return 30;
  return 38;
}

function ExerciseMediaThumbnailInner({
  imageUrl,
  bundledSource,
  size,
  accessibilityLabel,
  style,
  testID,
  onLoadError,
  accessibilityHint,
  accessibilityElementsHidden,
}: ExerciseMediaThumbnailProps) {
  const uri = useMemo(() => {
    const t = typeof imageUrl === "string" ? imageUrl.trim() : "";
    return t.length > 0 ? t : null;
  }, [imageUrl]);

  const [loadFailed, setLoadFailed] = useState(false);
  useEffect(() => {
    setLoadFailed(false);
  }, [uri, bundledSource]);

  const onImageError = useCallback(() => {
    setLoadFailed(true);
    onLoadError?.();
  }, [onLoadError]);

  const showRemote = uri != null && !loadFailed;
  const showBundled = !showRemote && bundledSource != null && !loadFailed;
  const hasMedia = showRemote || showBundled;

  const outerStyle = useMemo(() => {
    const tone = hasMedia
      ? { backgroundColor: MEDIA_SURFACE, borderColor: MEDIA_BORDER }
      : { backgroundColor: PLACEHOLDER_SURFACE, borderColor: PLACEHOLDER_BORDER };

    const shell = {
      ...tone,
      borderRadius: OUTER_RADIUS,
      overflow: "hidden" as const,
      borderWidth: StyleSheet.hairlineWidth,
    };

    if (size === "row") {
      return [shell, { width: ROW_W, height: ROW_H }, style];
    }
    if (size === "preview") {
      return [shell, { width: "100%", height: PREVIEW_H, alignSelf: "stretch" }, style];
    }
    // card — workout log expanded (fixed height, white card integration)
    return [shell, { width: "100%", height: CARD_H, alignSelf: "stretch" }, style];
  }, [size, style, hasMedia]);

  return (
    <View
      testID={testID ?? "ExerciseMediaThumbnail"}
      style={outerStyle}
      accessibilityLabel={accessibilityLabel}
      {...(accessibilityHint != null ? { accessibilityHint } : {})}
      {...(accessibilityElementsHidden === true ? { accessibilityElementsHidden: true as const } : {})}
    >
      <View
        style={[
          styles.innerPad,
          hasMedia ? (size === "row" ? styles.innerPadMediaRow : styles.innerPadMedia) : styles.innerPadPlaceholder,
        ]}
      >
        {showRemote ? (
          <Image
            source={{ uri }}
            style={styles.fill}
            resizeMode="contain"
            accessible={false}
            onError={onImageError}
          />
        ) : showBundled ? (
          <Image
            source={bundledSource}
            style={styles.fill}
            resizeMode="contain"
            accessible={false}
            onError={onImageError}
          />
        ) : (
          <View style={styles.placeholderInner} accessible={false} testID="ExerciseMediaThumbnailPlaceholder">
            <Ionicons name="add" size={placeholderIconSize(size)} color="#8E8E93" />
          </View>
        )}
      </View>
    </View>
  );
}

export const ExerciseMediaThumbnail = memo(ExerciseMediaThumbnailInner);

const styles = StyleSheet.create({
  innerPad: {
    flex: 1,
    minHeight: 0,
    minWidth: 0,
    justifyContent: "center",
    alignItems: "center",
  },
  innerPadMedia: {
    padding: INNER_PAD_MEDIA_DEFAULT,
  },
  innerPadMediaRow: {
    padding: INNER_PAD_MEDIA_ROW,
  },
  innerPadPlaceholder: {
    padding: 4,
  },
  fill: {
    width: "100%",
    height: "100%",
    backgroundColor: "transparent",
  },
  placeholderInner: {
    flex: 1,
    width: "100%",
    minHeight: 0,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "transparent",
  },
});
