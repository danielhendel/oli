"use client";

import { summarizeExerciseForCanvas } from "@/features/workout-studio/exerciseSummaryUtils";
import type { WorkoutExerciseCard } from "@/features/workout-studio/types";
import styles from "./exerciseCard.module.css";

type ExerciseCardHeaderProps = {
  exercise: WorkoutExerciseCard;
  expanded: boolean;
  onToggleExpand: () => void;
  onDuplicate: () => void;
  onRemove: () => void;
  onMoveUp?: () => void;
  onMoveDown?: () => void;
  moveTargets: { id: string; title: string }[];
  onMoveToBlock: (targetBlockId: string) => void;
};

export function ExerciseCardHeader({
  exercise,
  expanded,
  onToggleExpand,
  onDuplicate,
  onRemove,
  onMoveUp,
  onMoveDown,
  moveTargets,
  onMoveToBlock,
}: ExerciseCardHeaderProps) {
  const summary = summarizeExerciseForCanvas(exercise);
  const primaryMuscle = exercise.primaryMuscles[0] ?? summary.primaryMuscleLabel ?? "—";
  const equipment = exercise.equipment[0] ?? "—";
  const pattern = exercise.movementPattern ?? "—";

  return (
    <header className={styles.header}>
      <div className={styles.thumbnail} aria-hidden="true">
        <span className={styles.thumbnailIcon}>▶</span>
        <span className={styles.thumbnailLabel}>Media</span>
      </div>

      <div className={styles.headerMain}>
        <div className={styles.headerTopRow}>
          <button type="button" className={styles.headerTitleButton} onClick={onToggleExpand}>
            <h4 className={styles.exerciseName}>{exercise.exerciseName || "Unnamed exercise"}</h4>
            <span className={styles.expandChevron} aria-hidden="true">
              {expanded ? "−" : "+"}
            </span>
          </button>
          <div className={styles.headerActions}>
            {onMoveUp ? (
              <button type="button" className={styles.iconButton} onClick={onMoveUp} title="Move up">
                ↑
              </button>
            ) : null}
            {onMoveDown ? (
              <button type="button" className={styles.iconButton} onClick={onMoveDown} title="Move down">
                ↓
              </button>
            ) : null}
            <button type="button" className={styles.iconButton} onClick={onDuplicate} title="Duplicate">
              Dup
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
            <button type="button" className={styles.iconButtonDanger} onClick={onRemove} title="Remove">
              Remove
            </button>
          </div>
        </div>

        <div className={styles.metaGrid}>
          <div className={styles.metaItem}>
            <span className={styles.metaLabel}>Primary</span>
            <span className={styles.metaValue}>{primaryMuscle}</span>
          </div>
          <div className={styles.metaItem}>
            <span className={styles.metaLabel}>Equipment</span>
            <span className={styles.metaValue}>{equipment}</span>
          </div>
          <div className={styles.metaItem}>
            <span className={styles.metaLabel}>Pattern</span>
            <span className={styles.metaValue}>{pattern}</span>
          </div>
          <div className={styles.metaItem}>
            <span className={styles.metaLabel}>Volume</span>
            <span className={styles.metaValue}>{summary.volumeSetContribution} sets</span>
          </div>
        </div>

        <div className={styles.badgeRow}>
          {exercise.source === "canonical" ? (
            <span className={styles.badgeCanonical}>Canonical</span>
          ) : (
            <span className={styles.badgeCustom}>Custom</span>
          )}
          {exercise.exerciseId ? (
            <span className={styles.badgeId}>{exercise.exerciseId}</span>
          ) : null}
          <span className={styles.badgeMuted}>
            {summary.repRangeSummary} · RPE {summary.rpeSummary} · RIR {summary.rirSummary}
          </span>
        </div>
      </div>
    </header>
  );
}
