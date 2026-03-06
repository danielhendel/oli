/**
 * Renders exercise media: loop video when available, otherwise thumbnail image or neutral placeholder.
 * Safe fallback when media is missing. Used in picker detail, expanded logger card.
 * Video uses contain so full movement is visible; no aggressive cropping.
 */

import React, { memo } from "react";
import { View, Image, StyleSheet } from "react-native";
import { useVideoPlayer, VideoView } from "expo-video";
import { getExerciseMedia, hasBundledExerciseAsset } from "@/lib/workouts/exercises/media/registry";
import { ThumbnailPlaceholderView } from "./ThumbnailPlaceholderView";

type ExerciseMediaPreviewProps = {
  exerciseId: string;
  style?: object;
  /** When set, preview uses fixed height. When omitted, fills parent (e.g. hero with aspectRatio). */
  height?: number;
  /** Optional background color for the preview container (e.g. #FFFFFF to blend with white media). */
  containerBackgroundColor?: string;
};

const fillStyle = { width: "100%" as const, height: "100%" as const };

function ExerciseMediaPreviewInner({
  exerciseId,
  style,
  height,
  containerBackgroundColor,
}: ExerciseMediaPreviewProps) {
  const media = getExerciseMedia(exerciseId);
  const loopVideoSource = media.loopVideo ?? null;
  const fillParent = height == null;
  const containerHeight = fillParent ? undefined : height;
  const bgColor = containerBackgroundColor ?? styles.videoContainer.backgroundColor;

  const player = useVideoPlayer(loopVideoSource, (p) => {
    if (loopVideoSource != null) {
      p.loop = true;
      p.muted = true;
      p.play();
    }
  });

  const baseContainerStyle = fillParent
    ? [styles.videoContainer, styles.fillParent, { backgroundColor: bgColor }, style]
    : [styles.videoContainer, { height: containerHeight, backgroundColor: bgColor }, style];

  if (loopVideoSource != null) {
    return (
      <View style={baseContainerStyle}>
        <VideoView
          player={player}
          style={fillStyle}
          contentFit="contain"
          nativeControls={false}
        />
      </View>
    );
  }

  const baseImageContainerStyle = fillParent
    ? [styles.container, styles.fillParent, { backgroundColor: bgColor }, style]
    : [styles.container, { height: containerHeight, backgroundColor: bgColor }, style];

  if (hasBundledExerciseAsset(exerciseId)) {
    return (
      <View style={baseImageContainerStyle}>
        <Image
          source={media.thumbnail}
          style={[fillStyle, styles.image]}
          resizeMode="contain"
          accessibilityLabel={`${exerciseId} thumbnail`}
        />
      </View>
    );
  }

  return (
    <View style={baseImageContainerStyle}>
      <ThumbnailPlaceholderView size={fillParent ? 80 : Math.min(height ?? 160, 80)} />
    </View>
  );
}

export const ExerciseMediaPreview = memo(ExerciseMediaPreviewInner);

const styles = StyleSheet.create({
  container: {
    width: "100%",
    overflow: "hidden",
    borderRadius: 8,
    backgroundColor: "#E5E5EA",
  },
  videoContainer: {
    width: "100%",
    overflow: "hidden",
    borderRadius: 8,
    backgroundColor: "#E5E5EA",
  },
  fillParent: {
    flex: 1,
    width: "100%",
    height: "100%",
  },
  image: {
    width: "100%",
    height: "100%",
  },
});
