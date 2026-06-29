"use client";

import { useMemo } from "react";

import { getExerciseMediaOsBundle } from "@/features/exercise-media-os/exerciseMediaRegistry";
import { summarizeExerciseForCanvas } from "@/features/workout-studio/exerciseSummaryUtils";
import type { WorkoutExerciseCard } from "@/features/workout-studio/types";

import {
  readinessLabel,
  readinessStars,
} from "./exercise-card/mediaLessonDirectorUi";
import styles from "./WorkoutExerciseCardEditor.module.css";

type WorkoutExerciseCardEditorProps = {
  exercise: WorkoutExerciseCard;
  currentBlockId: string;
  otherBlocks: { id: string; title: string }[];
  onOpenExperience: () => void;
  onRemove: () => void;
  onDuplicate: () => void;
  onMoveUp?: () => void;
  onMoveDown?: () => void;
  onMoveToBlock: (targetBlockId: string) => void;
};

function renderStars(count: number): string {
  return "★".repeat(count);
}

export function WorkoutExerciseCardEditor({
  exercise,
  currentBlockId,
  otherBlocks,
  onOpenExperience,
  onRemove,
  onDuplicate,
  onMoveUp,
  onMoveDown,
  onMoveToBlock,
}: WorkoutExerciseCardEditorProps) {
  const moveTargets = otherBlocks.filter((block) => block.id !== currentBlockId);
  const summary = useMemo(() => summarizeExerciseForCanvas(exercise), [exercise]);

  const mediaReadiness = useMemo(() => {
    const bundle = getExerciseMediaOsBundle({
      exerciseId: exercise.exerciseId,
      exerciseName: exercise.exerciseName,
      mediaComposer: exercise.mediaComposer,
    });
    return {
      stars: readinessStars(bundle.readiness.score),
      label: readinessLabel(bundle.readiness.score),
    };
  }, [exercise.exerciseId, exercise.exerciseName, exercise.mediaComposer]);

  const primaryMuscle = exercise.primaryMuscles[0] ?? summary.primaryMuscleLabel ?? "—";
  const secondaryMuscle = exercise.secondaryMuscles[0];

  return (
    <article className={styles.summaryCard} data-testid="exercise-summary-card">
      <div className={styles.summaryMain}>
        <div className={styles.summaryTop}>
          <div>
            <h4 className={styles.exerciseName}>{exercise.exerciseName || "Unnamed exercise"}</h4>
            <div className={styles.badgeRow}>
              {exercise.source === "canonical" ? (
                <span className={styles.badgeCanonical}>Canonical</span>
              ) : (
                <span className={styles.badgeCustom}>Custom</span>
              )}
              {exercise.exerciseId ? (
                <span className={styles.badgeId}>{exercise.exerciseId}</span>
              ) : null}
            </div>
          </div>

          <div className={styles.mediaReadiness} aria-label={`Media ${mediaReadiness.label}`}>
            <span className={styles.mediaStars}>{renderStars(mediaReadiness.stars)}</span>
            <span className={styles.mediaLabel}>{mediaReadiness.label}</span>
          </div>
        </div>

        <div className={styles.metaGrid}>
          <div className={styles.metaItem}>
            <span className={styles.metaLabel}>Sets</span>
            <span className={styles.metaValue}>{summary.setCount}</span>
          </div>
          <div className={styles.metaItem}>
            <span className={styles.metaLabel}>Primary</span>
            <span className={styles.metaValue}>{primaryMuscle}</span>
          </div>
          {secondaryMuscle ? (
            <div className={styles.metaItem}>
              <span className={styles.metaLabel}>Secondary</span>
              <span className={styles.metaValue}>{secondaryMuscle}</span>
            </div>
          ) : null}
          <div className={styles.metaItem}>
            <span className={styles.metaLabel}>Volume</span>
            <span className={styles.metaValue}>{summary.volumeSetContribution} sets</span>
          </div>
        </div>

        <p className={styles.prescriptionSummary}>
          {summary.repRangeSummary} · RPE {summary.rpeSummary} · RIR {summary.rirSummary}
        </p>
      </div>

      <div className={styles.summaryActions}>
        <button type="button" className={styles.openExperienceButton} onClick={onOpenExperience}>
          Open Experience
        </button>
        {onMoveUp ? (
          <button type="button" className={styles.actionButton} onClick={onMoveUp} title="Move up">
            ↑
          </button>
        ) : null}
        {onMoveDown ? (
          <button type="button" className={styles.actionButton} onClick={onMoveDown} title="Move down">
            ↓
          </button>
        ) : null}
        <button type="button" className={styles.actionButton} onClick={onDuplicate}>
          Duplicate
        </button>
        {moveTargets.length > 0 ? (
          <select
            className={styles.moveSelect}
            defaultValue=""
            aria-label="Move to block"
            onChange={(event) => {
              const target = event.target.value;
              if (target) onMoveToBlock(target);
              event.target.value = "";
            }}
          >
            <option value="">Move to…</option>
            {moveTargets.map((block) => (
              <option key={block.id} value={block.id}>
                {block.title}
              </option>
            ))}
          </select>
        ) : null}
        <button type="button" className={styles.actionButtonDanger} onClick={onRemove}>
          Remove
        </button>
      </div>
    </article>
  );
}
