/**
 * Renders exercise media: loop video when available, otherwise thumbnail image or neutral placeholder.
 * Safe fallback when media is missing. Used in picker detail, expanded logger card.
 * Video uses contain so full movement is visible; still images use shared 16:9 ExerciseMediaThumbnail (contain).
 */

import React, { memo, useMemo } from "react";
import { View, StyleSheet } from "react-native";
import { useVideoPlayer, VideoView } from "expo-video";
import { getExerciseMedia, hasBundledExerciseAsset } from "@/lib/workouts/exercises/media/registry";
import {
  resolveWorkoutExerciseRemoteImageUri,
  resolveWorkoutExerciseRemoteVideoUri,
  type CustomExerciseMediaFields,
  type SessionExerciseMediaSnapshot,
} from "@/lib/workouts/exercises/workoutExerciseMediaResolve";
import { ExerciseMediaThumbnail } from "./ExerciseMediaThumbnail";

/** Video loop frame — white inside cards (no gray slab behind content). */
const VIDEO_FRAME_BG = "#FFFFFF";
const VIDEO_FRAME_BORDER = "#E8E8ED";

type ExerciseMediaPreviewProps = {
  exerciseId: string;
  /** Session snapshot from `workout_exercise_added` (optional). */
  sessionMedia?: SessionExerciseMediaSnapshot | null;
  /** Merged custom exercise row — imageUrl/videoUrl from local + API merge. */
  customRecord?: CustomExerciseMediaFields | null;
  /** When true, skip all video sources (e.g. compact row thumbnails). */
  preferStillThumbnail?: boolean;
  style?: object;
  /** When set, compact near-square row thumbnail. When omitted, fills parent (card hero). */
  height?: number;
  /** Optional background color for the video preview container. */
  containerBackgroundColor?: string;
};

const fillStyle = { width: "100%" as const, height: "100%" as const };

type LoopSource = number | { uri: string } | null;

function ExerciseMediaPreviewInner({
  exerciseId,
  sessionMedia,
  customRecord,
  preferStillThumbnail = false,
  style,
  height,
  containerBackgroundColor,
}: ExerciseMediaPreviewProps) {
  const remoteVideoUri = preferStillThumbnail
    ? null
    : resolveWorkoutExerciseRemoteVideoUri(customRecord ?? null, sessionMedia ?? null);
  const remoteImageUri = resolveWorkoutExerciseRemoteImageUri(customRecord ?? null, sessionMedia ?? null);

  const bundledMedia = useMemo(() => getExerciseMedia(exerciseId), [exerciseId]);
  const bundledLoop = bundledMedia.loopVideo ?? null;
  const bundledHasThumb = hasBundledExerciseAsset(exerciseId);

  const loopVideoSource: LoopSource = useMemo(() => {
    if (preferStillThumbnail) return null;
    if (remoteVideoUri != null) return { uri: remoteVideoUri };
    if (bundledLoop != null) return bundledLoop;
    return null;
  }, [preferStillThumbnail, remoteVideoUri, bundledLoop]);

  const player = useVideoPlayer(loopVideoSource, (p) => {
    if (loopVideoSource != null) {
      p.loop = true;
      p.muted = true;
      p.play();
    }
  });

  const fillParent = height == null;
  const containerHeight = fillParent ? undefined : height;
  const bgColor = containerBackgroundColor ?? VIDEO_FRAME_BG;
  /** Collapsed logger row / picker strip uses compact row thumbnail; expanded hero fills parent. */
  const thumbSize = preferStillThumbnail ? "row" : fillParent ? "card" : "row";

  const baseContainerStyle = fillParent
    ? [styles.videoContainer, styles.fillParent, { backgroundColor: bgColor }, style]
    : [styles.videoContainer, { height: containerHeight, backgroundColor: bgColor }, style];

  if (loopVideoSource != null) {
    return (
      <View style={baseContainerStyle}>
        <VideoView player={player} style={fillStyle} contentFit="contain" nativeControls={false} />
      </View>
    );
  }

  const stillStyle =
    preferStillThumbnail ? [style] : fillParent ? [styles.fillParent, style] : [style];

  if (remoteImageUri != null) {
    return (
      <ExerciseMediaThumbnail
        imageUrl={remoteImageUri}
        size={thumbSize}
        accessibilityLabel={`${exerciseId} reference image`}
        style={stillStyle}
      />
    );
  }

  if (bundledHasThumb) {
    return (
      <ExerciseMediaThumbnail
        bundledSource={bundledMedia.thumbnail as number}
        size={thumbSize}
        accessibilityLabel={`${exerciseId} thumbnail`}
        style={stillStyle}
      />
    );
  }

  return (
    <ExerciseMediaThumbnail
      size={thumbSize}
      accessibilityLabel={`${exerciseId} thumbnail placeholder`}
      style={stillStyle}
    />
  );
}

export const ExerciseMediaPreview = memo(ExerciseMediaPreviewInner);

const styles = StyleSheet.create({
  videoContainer: {
    width: "100%",
    overflow: "hidden",
    borderRadius: 12,
    backgroundColor: VIDEO_FRAME_BG,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: VIDEO_FRAME_BORDER,
  },
  fillParent: {
    flex: 1,
    width: "100%",
    height: "100%",
    minHeight: 0,
  },
});
