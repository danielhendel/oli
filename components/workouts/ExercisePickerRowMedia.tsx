/**
 * Exercise Library row thumbnail: load-safe media, plus placeholder, optional add-image tap for owned customs.
 */
import React, { useCallback, useEffect, useState } from "react";
import { ActivityIndicator, Pressable, StyleSheet, View } from "react-native";
import { ExerciseMediaThumbnail } from "@/components/workouts/ExerciseMediaThumbnail";
import { getBundledExerciseAsset } from "@/lib/workouts/exercises/media/registry";
import { SYSTEM_ACCENT } from "@/lib/ui/theme/systemAccent";

export type ExercisePickerRowMediaProps = {
  exerciseId: string;
  name: string;
  customThumbUri: string | null;
  hasBundledThumb: boolean;
  isOwnedCustom: boolean;
  sessionId: string | undefined;
  /** True while an image upload is in flight for this row. */
  uploading: boolean;
  thumbnailStyle: object;
  onAddImage: (exerciseId: string) => void | Promise<void>;
};

export function ExercisePickerRowMedia({
  exerciseId,
  name,
  customThumbUri,
  hasBundledThumb,
  isOwnedCustom,
  sessionId,
  uploading,
  thumbnailStyle,
  onAddImage,
}: ExercisePickerRowMediaProps) {
  const [loadFailed, setLoadFailed] = useState(false);
  useEffect(() => {
    setLoadFailed(false);
  }, [exerciseId, customThumbUri, hasBundledThumb]);

  const onLoadError = useCallback(() => {
    setLoadFailed(true);
  }, []);

  const canTryRemote = Boolean(customThumbUri && customThumbUri.length > 0) && !loadFailed;
  const canTryBundled = hasBundledThumb && !loadFailed;
  const interactiveAdd = isOwnedCustom && !canTryRemote && !canTryBundled;

  const accessibilityLabel = interactiveAdd
    ? `Add image, ${name}`
    : canTryRemote
      ? `${name} reference image`
      : canTryBundled
        ? `${name} image`
        : `${name} thumbnail placeholder`;

  const bundledPlaceholderHint =
    !isOwnedCustom && !canTryRemote && !canTryBundled
      ? "Built-in exercise. Use the menu to customize and add your own image."
      : undefined;

  const thumb = (
    <ExerciseMediaThumbnail
      size="row"
      style={thumbnailStyle}
      accessibilityLabel={accessibilityLabel}
      {...(interactiveAdd ? { accessibilityElementsHidden: true as const } : {})}
      {...(!interactiveAdd && bundledPlaceholderHint != null
        ? { accessibilityHint: bundledPlaceholderHint }
        : {})}
      {...(canTryRemote ? { imageUrl: customThumbUri!, onLoadError } : {})}
      {...(canTryBundled ? { bundledSource: getBundledExerciseAsset(exerciseId), onLoadError } : {})}
    />
  );

  const busyOverlay =
    uploading ? (
      <View style={styles.uploadOverlay} pointerEvents="none">
        <ActivityIndicator color={SYSTEM_ACCENT} />
      </View>
    ) : null;

  if (interactiveAdd) {
    return (
      <Pressable
        onPress={() => {
          void onAddImage(exerciseId);
        }}
        disabled={uploading || sessionId == null}
        hitSlop={12}
        accessibilityRole="button"
        accessibilityLabel={accessibilityLabel}
        accessibilityHint="Opens your photo library to attach a reference image."
        testID={`exercise-picker-thumb-add-${exerciseId}`}
        style={styles.thumbHost}
      >
        {thumb}
        {busyOverlay}
      </Pressable>
    );
  }

  return (
    <View style={styles.thumbHost}>
      {thumb}
      {busyOverlay}
    </View>
  );
}

const styles = StyleSheet.create({
  thumbHost: {
    position: "relative",
  },
  uploadOverlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.65)",
  },
});
