"use client";

import { useMemo } from "react";

import { ExerciseThumbnail } from "@/components/workout-studio/ExerciseThumbnail";
import {
  buildExercisePrescriptionRowSummary,
  formatDesignedSetDetailLine,
  formatExercisePrescriptionHeadline,
} from "@/features/workout-studio/buildExercisePrescriptionRowSummary";
import { resolveExerciseThumbnail } from "@/features/workout-studio/resolveExerciseThumbnail";
import {
  parseRestSecondsInput,
  parseRpeTargetInput,
  updateExercisePrescriptionFromRow,
} from "@/features/workout-studio/updateExercisePrescriptionFromRow";
import type { WorkoutExerciseCard } from "@/features/workout-studio/types";
import styles from "./WorkoutExercisePrescriptionRow.module.css";

type WorkoutExercisePrescriptionRowProps = {
  exercise: WorkoutExerciseCard;
  currentBlockId: string;
  otherBlocks: { id: string; title: string }[];
  onUpdate: (patch: Partial<WorkoutExerciseCard>) => void;
  onCustomize: () => void;
  onRemove: () => void;
  onDuplicate: () => void;
  onMoveUp?: () => void;
  onMoveDown?: () => void;
  onMoveToBlock: (targetBlockId: string) => void;
};

export function WorkoutExercisePrescriptionRow({
  exercise,
  currentBlockId,
  otherBlocks,
  onUpdate,
  onCustomize,
  onRemove,
  onDuplicate,
  onMoveUp,
  onMoveDown,
  onMoveToBlock,
}: WorkoutExercisePrescriptionRowProps) {
  const summary = useMemo(
    () => buildExercisePrescriptionRowSummary(exercise.designedSets),
    [exercise.designedSets],
  );

  const headline = useMemo(
    () => formatExercisePrescriptionHeadline(exercise.designedSets),
    [exercise.designedSets],
  );

  const thumbnail = useMemo(
    () =>
      resolveExerciseThumbnail({
        exerciseId: exercise.exerciseId ?? exercise.id,
        exerciseName: exercise.exerciseName,
        primaryMuscle: exercise.primaryMuscles[0],
        equipment: exercise.equipment[0],
      }),
    [exercise.equipment, exercise.exerciseId, exercise.exerciseName, exercise.id, exercise.primaryMuscles],
  );

  const moveTargets = otherBlocks.filter((block) => block.id !== currentBlockId);
  const exerciseLabel = exercise.exerciseName || "Unnamed exercise";

  const applyPrescriptionPatch = (patch: Parameters<typeof updateExercisePrescriptionFromRow>[1]) => {
    const nextExercise = updateExercisePrescriptionFromRow(exercise, patch);
    onUpdate({ designedSets: nextExercise.designedSets });
  };

  return (
    <article className={styles.row} data-testid="exercise-prescription-row">
      <div className={styles.visualCard}>
        <h4 className={styles.exerciseName}>{exerciseLabel}</h4>
        <div className={styles.badgeRow}>
          {exercise.source === "canonical" ? (
            <span className={styles.badgeCanonical}>Canonical</span>
          ) : (
            <span className={styles.badgeCustom}>Custom</span>
          )}
          {exercise.exerciseId ? <span className={styles.badgeId}>{exercise.exerciseId}</span> : null}
        </div>
        <div className={styles.thumbnailWrap}>
          <ExerciseThumbnail source={thumbnail} size="lg" />
        </div>
      </div>

      <div className={styles.prescriptionCard}>
        <div className={styles.prescriptionHeadline}>{headline}</div>

        <div className={styles.prescriptionGrid}>
          <label className={styles.field}>
            <span className={styles.fieldLabel}>Sets</span>
            <div className={styles.setStepper}>
              <button
                type="button"
                className={styles.stepButton}
                aria-label={`Decrease sets for ${exerciseLabel}`}
                disabled={summary.setCount <= 1}
                onClick={() => {
                  applyPrescriptionPatch({
                    field: "setCount",
                    value: Math.max(1, summary.setCount - 1),
                  });
                }}
              >
                −
              </button>
              <input
                className={`${styles.fieldInput} ${styles.setCountInput}`}
                type="number"
                min={1}
                max={20}
                value={summary.setCount}
                aria-label={`Sets for ${exerciseLabel}`}
                onChange={(event) => {
                  const parsed = Number(event.target.value);
                  if (!Number.isFinite(parsed)) return;
                  applyPrescriptionPatch({ field: "setCount", value: parsed });
                }}
              />
              <button
                type="button"
                className={styles.stepButton}
                aria-label={`Increase sets for ${exerciseLabel}`}
                disabled={summary.setCount >= 20}
                onClick={() => {
                  applyPrescriptionPatch({
                    field: "setCount",
                    value: Math.min(20, summary.setCount + 1),
                  });
                }}
              >
                +
              </button>
            </div>
          </label>

          <label className={styles.field}>
            <span className={styles.fieldLabel}>Reps</span>
            <input
              className={`${styles.fieldInput} ${summary.repRangeIsMixed ? styles.fieldInputMixed : ""}`}
              value={summary.repRangeIsMixed ? "" : summary.repRangeValue}
              placeholder={summary.repRangeIsMixed ? "Mixed" : "8-12"}
              aria-label={`Rep range for ${exerciseLabel}`}
              onChange={(event) => {
                applyPrescriptionPatch({ field: "repRange", value: event.target.value });
              }}
            />
          </label>

          <label className={styles.field}>
            <span className={styles.fieldLabel}>RPE</span>
            <input
              className={`${styles.fieldInput} ${summary.rpeIsMixed ? styles.fieldInputMixed : ""}`}
              value={summary.rpeIsMixed ? "" : summary.rpeValue}
              placeholder={summary.rpeIsMixed ? "Mixed" : "8"}
              inputMode="decimal"
              aria-label={`RPE for ${exerciseLabel}`}
              onChange={(event) => {
                applyPrescriptionPatch({
                  field: "rpeTarget",
                  value: parseRpeTargetInput(event.target.value),
                });
              }}
            />
          </label>

          <label className={styles.field}>
            <span className={styles.fieldLabel}>Rest (s)</span>
            <input
              className={`${styles.fieldInput} ${summary.restSecondsIsMixed ? styles.fieldInputMixed : ""}`}
              value={summary.restSecondsIsMixed ? "" : summary.restSecondsValue}
              placeholder={summary.restSecondsIsMixed ? "Mixed" : "90"}
              inputMode="numeric"
              aria-label={`Rest seconds for ${exerciseLabel}`}
              onChange={(event) => {
                applyPrescriptionPatch({
                  field: "restSeconds",
                  value: parseRestSecondsInput(event.target.value),
                });
              }}
            />
          </label>

          <label className={styles.field}>
            <span className={styles.fieldLabel}>Tempo</span>
            <input
              className={`${styles.fieldInput} ${summary.tempoIsMixed ? styles.fieldInputMixed : ""}`}
              value={summary.tempoIsMixed ? "" : summary.tempoValue}
              placeholder={summary.tempoIsMixed ? "Mixed" : "3-1-1"}
              aria-label={`Tempo for ${exerciseLabel}`}
              onChange={(event) => {
                applyPrescriptionPatch({ field: "tempo", value: event.target.value });
              }}
            />
          </label>
        </div>

        {exercise.designedSets.length > 0 ? (
          <ul className={styles.setDetails} aria-label={`Set details for ${exerciseLabel}`}>
            {exercise.designedSets.map((set) => (
              <li key={set.setId}>{formatDesignedSetDetailLine(set)}</li>
            ))}
          </ul>
        ) : null}

        <div className={styles.actions}>
          <button
            type="button"
            className={styles.customizeButton}
            onClick={onCustomize}
            aria-label={`Customize ${exerciseLabel}`}
          >
            Customize
          </button>
          <button
            type="button"
            className={styles.deleteButton}
            onClick={onRemove}
            aria-label={`Delete ${exerciseLabel}`}
          >
            Delete
          </button>
          <div className={styles.secondaryActions}>
            {onMoveUp ? (
              <button
                type="button"
                className={styles.secondaryButton}
                onClick={onMoveUp}
                aria-label={`Move ${exerciseLabel} up`}
              >
                ↑
              </button>
            ) : null}
            {onMoveDown ? (
              <button
                type="button"
                className={styles.secondaryButton}
                onClick={onMoveDown}
                aria-label={`Move ${exerciseLabel} down`}
              >
                ↓
              </button>
            ) : null}
            <button
              type="button"
              className={styles.secondaryButton}
              onClick={onDuplicate}
              aria-label={`Duplicate ${exerciseLabel}`}
            >
              Duplicate
            </button>
            {moveTargets.length > 0 ? (
              <select
                className={styles.moveSelect}
                defaultValue=""
                aria-label={`Move ${exerciseLabel} to block`}
                onChange={(event) => {
                  const target = event.target.value;
                  if (target) onMoveToBlock(target);
                  event.target.value = "";
                }}
              >
                <option value="">Move…</option>
                {moveTargets.map((block) => (
                  <option key={block.id} value={block.id}>
                    {block.title}
                  </option>
                ))}
              </select>
            ) : null}
          </div>
        </div>
      </div>
    </article>
  );
}
