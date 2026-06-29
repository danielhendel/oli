"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import {
  buildLessonPlaybackProgress,
  getNextPlaybackScene,
  getPreviousPlaybackScene,
  getPlaybackSceneById,
} from "@/features/exercise-media-os/playback/buildLessonPlaybackProgress";
import type { LessonPlaybackPlan, LessonPlaybackScene } from "@/features/exercise-media-os/playback/types";
import {
  isPlayablePlaybackMediaAsset,
  lessonScenePlaybackModeLabel,
  resolvePlaybackVideoSrc,
} from "@/features/exercise-media-os/playback/types";
import { formatLessonDuration } from "@/components/workout-studio/exercise-card/mediaLessonDirectorUi";

import styles from "./LessonPlaybackPlayer.module.css";

type LessonPlaybackPlayerProps = {
  plan: LessonPlaybackPlan;
  initialSceneId?: string;
};

type SceneVisualSurfaceProps = {
  scene: LessonPlaybackScene;
  isPlaying: boolean;
  onTogglePlaying: () => void;
  onVideoEnded: () => void;
};

function SceneVisualSurface({
  scene,
  isPlaying,
  onTogglePlaying,
  onVideoEnded,
}: SceneVisualSurfaceProps) {
  const [videoLoadError, setVideoLoadError] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const showVideo =
    isPlayablePlaybackMediaAsset(scene.mediaAsset) && !videoLoadError && scene.mediaAsset;
  const videoSrc = showVideo ? resolvePlaybackVideoSrc(scene.mediaAsset!) : undefined;
  const modeLabel = lessonScenePlaybackModeLabel(scene.mediaAsset);

  useEffect(() => {
    setVideoLoadError(false);
  }, [scene.sceneId]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video || !showVideo) return;

    if (isPlaying) {
      void video.play().catch(() => {
        setVideoLoadError(true);
      });
    } else {
      video.pause();
    }
  }, [isPlaying, showVideo, scene.sceneId]);

  if (showVideo && videoSrc) {
    return (
      <div className={styles.videoSurface}>
        <span className={styles.videoModeLabel}>{modeLabel}</span>
        <video
          ref={videoRef}
          key={scene.sceneId}
          className={styles.videoElement}
          controls
          playsInline
          preload="metadata"
          poster={scene.mediaAsset?.posterPath}
          onError={() => {
            setVideoLoadError(true);
          }}
          onEnded={onVideoEnded}
        >
          <source src={videoSrc} type="video/mp4" />
          {scene.mediaAsset?.captionsPath ? (
            <track kind="captions" src={scene.mediaAsset.captionsPath} label="Captions" />
          ) : null}
        </video>
        <p className={styles.visualLabel}>{scene.visualLabel}</p>
      </div>
    );
  }

  return (
    <div
      className={styles.visualSurface}
      style={{ background: scene.placeholderVisual.gradientHint }}
    >
      <span className={styles.videoModeLabel}>{modeLabel}</span>
      <div className={styles.visualOverlay} aria-hidden="true" />
      <span className={styles.visualIcon}>{scene.placeholderVisual.icon}</span>
      <p className={styles.visualLabel}>{scene.visualLabel}</p>
      <p className={styles.motionCue}>{scene.placeholderVisual.motionCue}</p>
      {scene.placeholderVisual.overlayLabels.length > 0 ? (
        <div className={styles.overlayRow}>
          {scene.placeholderVisual.overlayLabels.map((label) => (
            <span key={label} className={styles.overlayChip}>
              {label}
            </span>
          ))}
        </div>
      ) : null}
      <button
        type="button"
        className={`${styles.playOverlay} ${isPlaying ? styles.playOverlayActive : ""}`}
        aria-label={isPlaying ? "Pause lesson preview" : "Play lesson preview"}
        onClick={onTogglePlaying}
      >
        {isPlaying ? "❚❚" : "▶"}
      </button>
    </div>
  );
}

export function LessonPlaybackPlayer({ plan, initialSceneId }: LessonPlaybackPlayerProps) {
  const [currentSceneId, setCurrentSceneId] = useState(
    initialSceneId ?? plan.initialSceneId ?? plan.scenes[0]?.sceneId ?? "",
  );
  const [isPlaying, setIsPlaying] = useState(false);
  const [sceneElapsedSeconds, setSceneElapsedSeconds] = useState(0);

  const currentScene = useMemo(
    () => getPlaybackSceneById(plan, currentSceneId) ?? plan.scenes[0],
    [currentSceneId, plan],
  );

  const usingVideoAsset = isPlayablePlaybackMediaAsset(currentScene?.mediaAsset);

  const progress = useMemo(
    () =>
      buildLessonPlaybackProgress(
        plan,
        currentScene?.sceneId ?? plan.initialSceneId,
        sceneElapsedSeconds,
      ),
    [currentScene?.sceneId, plan, sceneElapsedSeconds],
  );

  const goToScene = useCallback((sceneId: string) => {
    setCurrentSceneId(sceneId);
    setSceneElapsedSeconds(0);
    setIsPlaying(false);
  }, []);

  const goNext = useCallback(() => {
    if (!currentScene) return;
    const next = getNextPlaybackScene(plan, currentScene.sceneId);
    if (next) {
      goToScene(next.sceneId);
    } else {
      setIsPlaying(false);
    }
  }, [currentScene, goToScene, plan]);

  const goPrevious = useCallback(() => {
    if (!currentScene) return;
    const previous = getPreviousPlaybackScene(plan, currentScene.sceneId);
    if (previous) {
      goToScene(previous.sceneId);
    }
  }, [currentScene, goToScene, plan]);

  useEffect(() => {
    if (!isPlaying || !currentScene || usingVideoAsset) return;

    const timer = window.setInterval(() => {
      setSceneElapsedSeconds((value) => {
        const next = value + 1;
        if (next >= currentScene.durationSeconds) {
          window.setTimeout(() => {
            goNext();
          }, 0);
          return currentScene.durationSeconds;
        }
        return next;
      });
    }, 1000);

    return () => {
      window.clearInterval(timer);
    };
  }, [currentScene, goNext, isPlaying, usingVideoAsset]);

  if (!currentScene) {
    return null;
  }

  const hasPrevious = Boolean(getPreviousPlaybackScene(plan, currentScene.sceneId));
  const hasNext = Boolean(getNextPlaybackScene(plan, currentScene.sceneId));

  const planStatusLabel =
    plan.assetStatus === "ready-assets"
      ? "Master Videos Ready"
      : plan.assetStatus === "partial-assets"
        ? "Partial Video Assets"
        : "Assets Pending Production";

  return (
    <div className={styles.playerRoot} data-testid="lesson-playback-player">
      <SceneVisualSurface
        scene={currentScene}
        isPlaying={isPlaying}
        onTogglePlaying={() => {
          setIsPlaying((value) => !value);
        }}
        onVideoEnded={goNext}
      />

      <div className={styles.statusRow}>
        <span className={styles.statusBadge}>Blueprint Complete</span>
        <span className={styles.statusBadgeReady}>Preview Available</span>
        <span
          className={
            plan.assetStatus === "ready-assets"
              ? styles.statusBadgeReady
              : styles.statusBadgePending
          }
        >
          {planStatusLabel}
        </span>
      </div>

      <p className={styles.placeholderNote}>
        {usingVideoAsset
          ? "Playing master video asset — teaching context shown below"
          : "Placeholder lesson preview — add approved local assets to play real video"}
      </p>

      <header className={styles.sceneHeader}>
        <div>
          <span className={styles.sceneKicker}>{currentScene.progressLabel}</span>
          <h3 className={styles.sceneTitle}>{currentScene.title}</h3>
          <p className={styles.sceneSubtitle}>{currentScene.subtitle}</p>
        </div>
        <div className={styles.durationMeta}>
          <span>{formatLessonDuration(currentScene.durationSeconds)}</span>
          <span>{formatLessonDuration(plan.totalDurationSeconds)} total</span>
        </div>
      </header>

      {currentScene.coachMessage ? (
        <section className={styles.contentSection}>
          <span className={styles.contentLabel}>Coach message</span>
          <p className={styles.coachMessage}>&ldquo;{currentScene.coachMessage}&rdquo;</p>
        </section>
      ) : null}

      <section className={styles.contentSection}>
        <span className={styles.contentLabel}>Narration</span>
        <p>{currentScene.narrationScript}</p>
      </section>

      <section className={styles.contentSection}>
        <span className={styles.contentLabel}>On-screen teaching</span>
        <p className={styles.onScreenText}>{currentScene.onScreenText}</p>
      </section>

      <section className={styles.contentSection}>
        <span className={styles.contentLabel}>Client purpose</span>
        <p>{currentScene.clientPurpose}</p>
      </section>

      <div className={styles.progressSection}>
        <div className={styles.progressBar} aria-hidden="true">
          <div className={styles.progressFill} style={{ width: `${progress.percentComplete}%` }} />
        </div>
        <div className={styles.progressMeta}>
          <span>
            {formatLessonDuration(progress.elapsedSeconds)} /{" "}
            {formatLessonDuration(progress.totalDurationSeconds)}
          </span>
          <span>{progress.percentComplete}%</span>
        </div>
      </div>

      <div className={styles.sceneChips} role="tablist" aria-label="Lesson scenes">
        {plan.scenes.map((scene) => (
          <button
            key={scene.sceneId}
            type="button"
            role="tab"
            aria-selected={scene.sceneId === currentScene.sceneId}
            aria-label={`${scene.title}, ${formatLessonDuration(scene.durationSeconds)}`}
            className={`${styles.sceneChip} ${
              scene.sceneId === currentScene.sceneId ? styles.sceneChipActive : ""
            } ${scene.mediaAsset ? styles.sceneChipHasAsset : ""}`}
            onClick={() => {
              goToScene(scene.sceneId);
            }}
          >
            <span className={styles.sceneChipIcon}>{scene.placeholderVisual.icon}</span>
          </button>
        ))}
      </div>

      <div className={styles.controlsRow}>
        <button
          type="button"
          className={styles.navButton}
          aria-label="Previous scene"
          disabled={!hasPrevious}
          onClick={goPrevious}
        >
          ← Previous
        </button>
        <button
          type="button"
          className={styles.navButtonPrimary}
          aria-label={isPlaying ? "Pause" : "Play"}
          onClick={() => {
            setIsPlaying((value) => !value);
          }}
        >
          {isPlaying ? "Pause" : "Play"}
        </button>
        <button
          type="button"
          className={styles.navButton}
          aria-label="Next scene"
          disabled={!hasNext}
          onClick={goNext}
        >
          Next →
        </button>
      </div>

      <footer className={styles.playerFooter}>
        <span>
          {plan.clientGoal} · {plan.teachingStyle} · {plan.difficulty}
        </span>
        <span>
          {currentScene.source === "coach-custom" ? "Your Voice" : "Oli Master"} ·{" "}
          {plan.approvedVideoAssetCount}/{plan.scenes.length} video assets
        </span>
      </footer>
    </div>
  );
}
