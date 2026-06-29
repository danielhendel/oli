"use client";

import { useMemo } from "react";

import { buildExerciseClientExperiencePreview } from "./buildExerciseClientExperiencePreview";
import type { WorkoutExerciseCard } from "@/features/workout-studio/types";

import styles from "./ExerciseExperienceLivePreview.module.css";

type ExerciseExperienceLivePreviewProps = {
  exercise: WorkoutExerciseCard;
  onOpenLessonPlayback?: () => void;
  lessonPlaybackAvailable?: boolean;
  lessonPlaybackStatusLabel?: string;
};

export function ExerciseExperienceLivePreview({
  exercise,
  onOpenLessonPlayback,
  lessonPlaybackAvailable = false,
  lessonPlaybackStatusLabel,
}: ExerciseExperienceLivePreviewProps) {
  const preview = useMemo(
    () => buildExerciseClientExperiencePreview(exercise),
    [exercise],
  );

  return (
    <aside className={styles.previewPanel} aria-label="Live client preview">
      <header className={styles.previewHeader}>
        <span className={styles.previewKicker}>Live client preview</span>
        <h3 className={styles.previewTitle}>What your client experiences</h3>
      </header>

      <div className={styles.deviceFrame}>
        <div className={styles.deviceNotch} aria-hidden="true" />
        <div className={styles.deviceScreen}>
          <span className={styles.sceneBadge}>{preview.activeSceneTitle}</span>

          <div
            className={`${styles.deviceMedia} ${
              preview.mediaVisualLabel ? styles.deviceMediaRich : ""
            } ${lessonPlaybackAvailable ? styles.deviceMediaInteractive : ""}`}
          >
            {lessonPlaybackAvailable ? (
              <button
                type="button"
                className={styles.devicePlayButton}
                aria-label="Open lesson playback preview"
                onClick={onOpenLessonPlayback}
              >
                <span className={styles.devicePlay} aria-hidden="true">
                  ▶
                </span>
              </button>
            ) : (
              <span className={styles.devicePlay} aria-hidden="true">
                ▶
              </span>
            )}
            {preview.mediaVisualLabel ? (
              <p className={styles.mediaVisualLabel}>{preview.mediaVisualLabel}</p>
            ) : null}
          </div>

          <h4 className={styles.exerciseName}>{preview.exerciseName}</h4>
          <p className={styles.goalTitle}>{preview.goalTitle}</p>
          <p className={styles.scenePurpose}>{preview.activeScenePurpose}</p>

          <section className={styles.previewSection}>
            <span className={styles.sectionLabel}>Prescription</span>
            <p className={styles.sectionValue}>{preview.setSummary}</p>
            {preview.rpeSummary !== "—" ? (
              <p className={styles.sectionMeta}>RPE {preview.rpeSummary}</p>
            ) : null}
          </section>

          {preview.coachMessage ? (
            <section className={styles.previewSection}>
              <span className={styles.sectionLabel}>Coach intro</span>
              <p className={styles.coachQuote}>&ldquo;{preview.coachMessage}&rdquo;</p>
            </section>
          ) : null}

          {preview.keyCues.length > 0 ? (
            <section className={styles.previewSection}>
              <span className={styles.sectionLabel}>Key cues</span>
              <ul className={styles.bulletList}>
                {preview.keyCues.map((cue) => (
                  <li key={cue}>{cue}</li>
                ))}
              </ul>
            </section>
          ) : null}

          {preview.shouldFeel.length > 0 ? (
            <section className={styles.previewSection}>
              <span className={styles.sectionLabel}>What to feel</span>
              <ul className={styles.bulletList}>
                {preview.shouldFeel.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </section>
          ) : null}

          {preview.trackingFields.length > 0 ? (
            <section className={styles.previewSection}>
              <span className={styles.sectionLabel}>Tracking</span>
              <div className={styles.trackingRow}>
                {preview.trackingFields.map((field) => (
                  <span key={field} className={styles.trackingPill}>
                    {field}
                  </span>
                ))}
              </div>
            </section>
          ) : null}

          <footer className={styles.previewFooter}>
            <span>
              Media {preview.mediaReadinessLabel}
              {preview.packageComplete ? " · Oli Master Package" : ""}
              {lessonPlaybackStatusLabel ? ` · ${lessonPlaybackStatusLabel}` : ""}
            </span>
            <span>{preview.timelineSceneCount} scenes</span>
          </footer>

          {lessonPlaybackAvailable ? (
            <button
              type="button"
              className={styles.previewLessonButton}
              onClick={onOpenLessonPlayback}
            >
              Preview Lesson
            </button>
          ) : null}
        </div>
      </div>
    </aside>
  );
}
