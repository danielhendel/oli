"use client";

import { useEffect, useRef } from "react";

import {
  mediaAssetPlaybackLabel,
  mediaAssetStatusLabel,
} from "@/features/exercise-media-os/mediaAssetRegistry";
import type { LessonPlaybackPlan } from "@/features/exercise-media-os/playback/types";
import { isPlayablePlaybackMediaAsset } from "@/features/exercise-media-os/playback/types";

import { LessonPlaybackPlayer } from "./LessonPlaybackPlayer";
import styles from "./LessonPlaybackModal.module.css";

type LessonPlaybackModalProps = {
  open: boolean;
  plan: LessonPlaybackPlan | null;
  exerciseName: string;
  onClose: () => void;
  initialSceneId?: string;
};

export function LessonPlaybackModal({
  open,
  plan,
  exerciseName,
  onClose,
  initialSceneId,
}: LessonPlaybackModalProps) {
  const dialogRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };

    document.addEventListener("keydown", handleKeyDown);
    dialogRef.current?.focus();

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [open, onClose]);

  if (!open || !plan) return null;

  return (
    <div className={styles.backdrop} onClick={onClose} role="presentation">
      <div
        ref={dialogRef}
        className={styles.dialog}
        role="dialog"
        aria-modal="true"
        aria-labelledby="lesson-playback-title"
        tabIndex={-1}
        onClick={(event) => {
          event.stopPropagation();
        }}
      >
        <header className={styles.header}>
          <div>
            <span className={styles.kicker}>Lesson Playback Prototype</span>
            <h2 id="lesson-playback-title" className={styles.title}>
              {exerciseName}
            </h2>
            <p className={styles.subtitle}>
              Storyboard-driven preview · {plan.scenes.length} scenes ·{" "}
              {plan.approvedVideoAssetCount} video assets approved
            </p>
          </div>
          <button type="button" className={styles.closeButton} onClick={onClose} aria-label="Close">
            ×
          </button>
        </header>

        <div className={styles.body}>
          <aside className={styles.sidebar} aria-label="Scene list">
            {plan.scenes.map((scene) => (
              <div key={scene.sceneId} className={styles.sidebarItem}>
                <span className={styles.sidebarIcon}>{scene.placeholderVisual.icon}</span>
                <div>
                  <strong>{scene.title}</strong>
                  <p>
                    {scene.durationSeconds}s ·{" "}
                    {scene.source === "coach-custom" ? "Your Voice" : "Oli Master"}
                  </p>
                  <p className={styles.sidebarAsset}>
                    Video Asset:{" "}
                    {scene.mediaAsset
                      ? mediaAssetStatusLabel(scene.mediaAsset.status)
                      : "Pending"}
                    {" · "}
                    {isPlayablePlaybackMediaAsset(scene.mediaAsset)
                      ? "Master video available"
                      : mediaAssetPlaybackLabel(plan.exerciseId, scene.slotId)}
                  </p>
                </div>
              </div>
            ))}
          </aside>

          <main className={styles.main}>
            <LessonPlaybackPlayer plan={plan} initialSceneId={initialSceneId} />
          </main>
        </div>
      </div>
    </div>
  );
}
