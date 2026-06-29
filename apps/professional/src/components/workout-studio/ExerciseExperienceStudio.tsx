"use client";

import { useMemo, useState } from "react";

import { ExerciseCardTabWorkspace } from "@/components/workout-studio/exercise-card/ExerciseCardTabWorkspace";
import {
  EXERCISE_CARD_TAB_HINTS,
  EXERCISE_CARD_TAB_LABELS,
  EXERCISE_CARD_TABS,
  type ExerciseCardTab,
} from "@/components/workout-studio/exercise-card/types";
import { ExerciseExperienceLivePreview } from "@/components/workout-studio/ExerciseExperienceLivePreview";
import { buildLessonPlaybackPreviewContext } from "@/features/exercise-media-os/playback/buildLessonPlaybackPreviewContext";
import { buildFocusCardsForExercise } from "@/components/workout-studio/exercise-card/mediaLessonDirectorUi";
import { resolveSelectedGoal } from "@/components/workout-studio/exercise-card/exerciseExperienceBuilderUi";
import { LessonPlaybackModal } from "@/components/workout-studio/media-playback/LessonPlaybackModal";
import type { ExerciseExperienceContext } from "@/features/workout-studio/exerciseExperienceWorkspace";
import type { WorkoutExerciseCard } from "@/features/workout-studio/types";

import styles from "./ExerciseExperienceStudio.module.css";

type ExerciseExperienceStudioProps = {
  context: ExerciseExperienceContext;
  onClose: () => void;
  onUpdate: (patch: Partial<WorkoutExerciseCard>) => void;
};

export function ExerciseExperienceStudio({
  context,
  onClose,
  onUpdate,
}: ExerciseExperienceStudioProps) {
  const [activeTab, setActiveTab] = useState<ExerciseCardTab>("sets");
  const [lessonPlaybackOpen, setLessonPlaybackOpen] = useState(false);
  const { exercise, blockTitle } = context;

  const playbackContext = useMemo(() => {
    const focusCards = buildFocusCardsForExercise(exercise.exerciseName, exercise.primaryMuscles);
    const clientGoal = resolveSelectedGoal(
      focusCards,
      exercise.mediaComposer?.selectedTodayFocus ?? "primaryMuscles",
    ).title;
    return buildLessonPlaybackPreviewContext({ exercise, clientGoal });
  }, [exercise]);

  const openLessonPlayback = () => {
    if (playbackContext.available) {
      setLessonPlaybackOpen(true);
    }
  };

  const primaryMuscle = exercise.primaryMuscles[0] ?? "—";
  const secondaryMuscle = exercise.secondaryMuscles[0];
  const equipment = exercise.equipment.join(", ") || "—";

  return (
    <div className={styles.studioRoot} data-testid="exercise-experience-studio">
      <header className={styles.studioHeader}>
        <div className={styles.headerLeft}>
          <button type="button" className={styles.backButton} onClick={onClose}>
            ← Back to Workout
          </button>
          <div>
            <span className={styles.headerKicker}>Exercise Experience Studio</span>
            <h2 className={styles.exerciseTitle}>{exercise.exerciseName}</h2>
            <p className={styles.headerMeta}>
              {blockTitle} · {exercise.exerciseId ?? "custom"} · {primaryMuscle}
              {secondaryMuscle ? ` · ${secondaryMuscle}` : ""} · {equipment}
            </p>
          </div>
        </div>
        <div className={styles.headerRight}>
          {exercise.source === "canonical" ? (
            <span className={styles.badgeCanonical}>Canonical</span>
          ) : (
            <span className={styles.badgeCustom}>Custom</span>
          )}
          <span className={styles.draftBadge}>Local draft</span>
        </div>
      </header>

      <div className={styles.studioBody}>
        <nav className={styles.tabRail} aria-label="Exercise workspace sections">
          {EXERCISE_CARD_TABS.map((tab) => (
            <button
              key={tab}
              type="button"
              role="tab"
              aria-selected={activeTab === tab}
              className={`${styles.tabRailButton} ${
                activeTab === tab ? styles.tabRailButtonActive : ""
              }`}
              onClick={() => {
                setActiveTab(tab);
              }}
            >
              <span className={styles.tabRailLabel}>{EXERCISE_CARD_TAB_LABELS[tab]}</span>
              <span className={styles.tabRailHint}>{EXERCISE_CARD_TAB_HINTS[tab]}</span>
            </button>
          ))}
        </nav>

        <main className={styles.workspaceMain}>
          <header className={styles.workspaceHeader}>
            <h3>{EXERCISE_CARD_TAB_LABELS[activeTab]}</h3>
            <p>{EXERCISE_CARD_TAB_HINTS[activeTab]}</p>
          </header>
          <div className={styles.workspaceContent}>
            <ExerciseCardTabWorkspace
              exercise={exercise}
              activeTab={activeTab}
              onUpdate={onUpdate}
              layout="studio"
              onOpenLessonPlayback={openLessonPlayback}
              lessonPlaybackAvailable={playbackContext.available}
            />
          </div>
        </main>

        <ExerciseExperienceLivePreview
          exercise={exercise}
          onOpenLessonPlayback={openLessonPlayback}
          lessonPlaybackAvailable={playbackContext.available}
          lessonPlaybackStatusLabel={playbackContext.statusLabel}
        />
      </div>

      <LessonPlaybackModal
        open={lessonPlaybackOpen}
        plan={playbackContext.plan}
        exerciseName={exercise.exerciseName}
        onClose={() => {
          setLessonPlaybackOpen(false);
        }}
      />
    </div>
  );
}
