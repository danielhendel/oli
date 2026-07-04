"use client";

import { useMemo, useState } from "react";

import type { ExerciseCardTab } from "@/components/workout-studio/exercise-card/types";
import { ExerciseThumbnail } from "@/components/workout-studio/ExerciseThumbnail";
import {
  applyBuilderPatch,
  applyExerciseLevelRepsToAllSets,
  applyExerciseLevelRestToAllSets,
  applyExerciseLevelSetCount,
  applyPerSetBuilderPatch,
  extendPerSetFieldsForSets,
  formatLoadGuidance,
  formatRepValueForMode,
  formatRestForDisplay,
  parseLoadGuidance,
  parseRestWithUnit,
  resolveExerciseBuilderPrescription,
  resolveIntensityTargetValue,
  resolvePerSetBuilderFields,
  resolveRestDisplayUnit,
  syncExerciseGeneralPrescription,
} from "@/features/workout-studio/exerciseBuilderPrescription";
import { buildExercisePrescriptionRowSummary } from "@/features/workout-studio/buildExercisePrescriptionRowSummary";
import { addDesignedSet, removeDesignedSet } from "@/features/workout-studio/designedSetUtils";
import { getExerciseOptionalDetailLinks } from "@/features/workout-studio/getExerciseOptionalDetailLinks";
import { resolveExerciseThumbnail } from "@/features/workout-studio/resolveExerciseThumbnail";
import { parseRpeTargetInput } from "@/features/workout-studio/updateExercisePrescriptionFromRow";
import type {
  ExerciseLoadMode,
  ExerciseLoadUnit,
  ExerciseRepsMode,
  ExerciseSideMode,
  IntensityTargetKind,
  RestDisplayUnit,
  WorkoutDesignedSet,
  WorkoutExerciseCard,
} from "@/features/workout-studio/types";
import {
  EXERCISE_LOAD_MODES,
  EXERCISE_LOAD_UNITS,
  EXERCISE_REPS_MODES,
  EXERCISE_SIDE_MODES,
  INTENSITY_TARGET_KINDS,
  REST_DISPLAY_UNITS,
} from "@/features/workout-studio/types";
import styles from "./WorkoutExercisePrescriptionRow.module.css";

type WorkoutExercisePrescriptionRowProps = {
  exercise: WorkoutExerciseCard;
  currentBlockId: string;
  otherBlocks: { id: string; title: string }[];
  onUpdate: (patch: Partial<WorkoutExerciseCard>) => void;
  onCustomize: (initialTab?: ExerciseCardTab) => void;
  onRemove: () => void;
  onDuplicate: () => void;
  onMoveUp?: () => void;
  onMoveDown?: () => void;
  onMoveToBlock: (targetBlockId: string) => void;
};

const REPS_MODE_LABELS: Record<ExerciseRepsMode, string> = {
  reps: "Reps",
  time: "Time",
  distance: "Distance",
};

const SIDE_MODE_LABELS: Record<ExerciseSideMode, string> = {
  total: "Total",
  each: "Each",
  left: "Left",
  right: "Right",
};

const LOAD_MODE_LABELS: Record<ExerciseLoadMode, string> = {
  totalWeight: "Total Weight",
  repMaxPercent: "Rep Max %",
};

const LOAD_UNIT_LABELS: Record<ExerciseLoadUnit, string> = {
  lbs: "lbs",
  kg: "kg",
  percent: "%",
};

const INTENSITY_KIND_LABELS: Record<IntensityTargetKind, string> = {
  rpe: "RPE",
  rir: "RIR",
};

function PerSetRow({
  set,
  exercise,
  exerciseLabel,
  onPatch,
  onDelete,
  canDelete,
}: {
  set: WorkoutDesignedSet;
  exercise: WorkoutExerciseCard;
  exerciseLabel: string;
  onPatch: (patch: Parameters<typeof applyPerSetBuilderPatch>[2]) => void;
  onDelete: () => void;
  canDelete: boolean;
}) {
  const builder = resolveExerciseBuilderPrescription(exercise);
  const fields = resolvePerSetBuilderFields(set, builder);
  const repValue = formatRepValueForMode(fields.repsMode, set.repRange);
  const restValue = formatRestForDisplay(set.restSeconds, fields.restUnit);
  const intensityValue = resolveIntensityTargetValue(set, fields.intensityKind);

  return (
    <div className={styles.customSetCard} data-testid={`per-set-row-${set.setNumber}`}>
      <div className={styles.customSetPrimaryRow}>
        <span className={styles.setIndex}>Set {set.setNumber}</span>

        <div className={styles.repsGroup}>
          <select
            className={`${styles.controlSelectSm} ${styles.repsTypeSelect}`}
            value={fields.repsMode}
            aria-label={`${exerciseLabel} set ${set.setNumber} reps type`}
            onChange={(event) => onPatch({ repsMode: event.target.value as ExerciseRepsMode })}
          >
            {EXERCISE_REPS_MODES.map((mode) => (
              <option key={mode} value={mode}>
                {REPS_MODE_LABELS[mode]}
              </option>
            ))}
          </select>

          <input
            className={styles.controlInputSm}
            value={repValue}
            placeholder={fields.repsMode === "reps" ? "8-12" : "30"}
            aria-label={`${exerciseLabel} set ${set.setNumber} reps value`}
            onChange={(event) => onPatch({ repValue: event.target.value })}
          />

          <select
            className={`${styles.controlSelectSm} ${styles.sideSelect}`}
            value={fields.sideMode}
            aria-label={`${exerciseLabel} set ${set.setNumber} side`}
            onChange={(event) => onPatch({ sideMode: event.target.value as ExerciseSideMode })}
          >
            {EXERCISE_SIDE_MODES.map((mode) => (
              <option key={mode} value={mode}>
                {SIDE_MODE_LABELS[mode]}
              </option>
            ))}
          </select>
        </div>

        <div className={styles.loadGroup}>
          <select
            className={`${styles.controlSelectMd} ${styles.loadTypeSelect}`}
            value={fields.loadMode}
            aria-label={`${exerciseLabel} set ${set.setNumber} load type`}
            onChange={(event) => {
              const loadMode = event.target.value as ExerciseLoadMode;
              onPatch({
                loadMode,
                loadUnit: loadMode === "repMaxPercent" ? "percent" : fields.loadUnit,
              });
            }}
          >
            {EXERCISE_LOAD_MODES.map((mode) => (
              <option key={mode} value={mode}>
                {LOAD_MODE_LABELS[mode]}
              </option>
            ))}
          </select>

          <input
            className={styles.controlInputSm}
            value={fields.loadValue}
            placeholder="135"
            aria-label={`${exerciseLabel} set ${set.setNumber} load value`}
            onChange={(event) => onPatch({ loadValue: event.target.value })}
          />

          <select
            className={`${styles.controlSelectSm} ${styles.loadUnitSelect}`}
            value={fields.loadMode === "repMaxPercent" ? "percent" : fields.loadUnit}
            disabled={fields.loadMode === "repMaxPercent"}
            aria-label={`${exerciseLabel} set ${set.setNumber} load unit`}
            onChange={(event) => onPatch({ loadUnit: event.target.value as ExerciseLoadUnit })}
          >
            {EXERCISE_LOAD_UNITS.map((unit) => (
              <option key={unit} value={unit}>
                {LOAD_UNIT_LABELS[unit]}
              </option>
            ))}
          </select>
        </div>

        <button
          type="button"
          className={styles.perSetDelete}
          disabled={!canDelete}
          aria-label={`Delete ${exerciseLabel} set ${set.setNumber}`}
          onClick={onDelete}
        >
          ×
        </button>
      </div>

      <div className={styles.customSetSecondaryRow}>
        <span className={styles.secondaryIndent} aria-hidden="true" />

        <div className={styles.intensityGroup}>
          <select
            className={`${styles.controlSelectSm} ${styles.intensityTypeSelect}`}
            value={fields.intensityKind}
            aria-label={`${exerciseLabel} set ${set.setNumber} intensity type`}
            onChange={(event) =>
              onPatch({ intensityKind: event.target.value as IntensityTargetKind })
            }
          >
            {INTENSITY_TARGET_KINDS.map((kind) => (
              <option key={kind} value={kind}>
                {INTENSITY_KIND_LABELS[kind]}
              </option>
            ))}
          </select>

          <input
            className={styles.controlInputSm}
            value={intensityValue}
            inputMode="decimal"
            aria-label={`${exerciseLabel} set ${set.setNumber} intensity value`}
            onChange={(event) => onPatch({ intensityValue: event.target.value })}
          />
        </div>

        <div className={styles.restGroup}>
          <input
            className={styles.controlInputSm}
            value={restValue}
            inputMode="numeric"
            aria-label={`${exerciseLabel} set ${set.setNumber} rest value`}
            onChange={(event) =>
              onPatch({ restSeconds: parseRestWithUnit(event.target.value, fields.restUnit) })
            }
          />

          <select
            className={`${styles.controlSelectSm} ${styles.restUnitSelect}`}
            value={fields.restUnit}
            aria-label={`${exerciseLabel} set ${set.setNumber} rest unit`}
            onChange={(event) => {
              const restUnit = event.target.value as RestDisplayUnit;
              onPatch({ restUnit, restSeconds: set.restSeconds });
            }}
          >
            {REST_DISPLAY_UNITS.map((unit) => (
              <option key={unit} value={unit}>
                {unit}
              </option>
            ))}
          </select>
        </div>

        <span className={styles.secondaryDeleteSpacer} aria-hidden="true" />
      </div>
    </div>
  );
}

function ExerciseLevelControlBar({
  exercise,
  exerciseLabel,
  summary,
  onUpdate,
}: {
  exercise: WorkoutExerciseCard;
  exerciseLabel: string;
  summary: ReturnType<typeof buildExercisePrescriptionRowSummary>;
  onUpdate: (patch: Partial<WorkoutExerciseCard>) => void;
}) {
  const builder = resolveExerciseBuilderPrescription(exercise);
  const firstSet = exercise.designedSets[0];
  const exerciseRestUnit = resolveRestDisplayUnit(firstSet?.restSeconds ?? null);
  const exerciseRepValue = formatRepValueForMode(
    builder.repsMode,
    summary.repRangeIsMixed ? (firstSet?.repRange ?? "") : summary.repRangeValue,
  );
  const exerciseRestSeconds = summary.restSecondsIsMixed
    ? (firstSet?.restSeconds ?? null)
    : (exercise.designedSets[0]?.restSeconds ?? null);
  const exerciseRestValue = formatRestForDisplay(exerciseRestSeconds, exerciseRestUnit);

  return (
    <div className={styles.exerciseControlBar} data-testid="exercise-level-control-bar">
      <label className={styles.controlBarField}>
        <span className={styles.fieldLabel}>Sets</span>
        <input
          className={styles.controlBarInput}
          type="number"
          min={1}
          max={20}
          value={summary.setCount}
          aria-label={`${exerciseLabel} set count`}
          onChange={(event) => {
            const parsed = Number(event.target.value);
            if (!Number.isFinite(parsed)) return;
            const next = applyExerciseLevelSetCount(exercise, parsed);
            onUpdate({
              designedSets: next.designedSets,
              builderPrescription: next.builderPrescription,
              prescription: next.prescription,
            });
          }}
        />
      </label>

      <label className={styles.controlBarField}>
        <span className={styles.fieldLabel}>Reps</span>
        <div className={styles.controlBarGroup}>
          <select
            className={styles.controlBarSelect}
            value={builder.repsMode}
            aria-label={`${exerciseLabel} all sets reps type`}
            onChange={(event) => {
              const repsMode = event.target.value as ExerciseRepsMode;
              const next = applyExerciseLevelRepsToAllSets(exercise, repsMode, exerciseRepValue);
              onUpdate({
                designedSets: next.designedSets,
                builderPrescription: next.builderPrescription,
                prescription: next.prescription,
              });
            }}
          >
            {EXERCISE_REPS_MODES.map((mode) => (
              <option key={mode} value={mode}>
                {REPS_MODE_LABELS[mode]}
              </option>
            ))}
          </select>
          <input
            className={styles.controlBarInput}
            value={exerciseRepValue}
            placeholder="8-12"
            aria-label={`${exerciseLabel} all sets reps value`}
            onChange={(event) => {
              const next = applyExerciseLevelRepsToAllSets(
                exercise,
                builder.repsMode,
                event.target.value,
              );
              onUpdate({
                designedSets: next.designedSets,
                builderPrescription: next.builderPrescription,
                prescription: next.prescription,
              });
            }}
          />
        </div>
      </label>

      <label className={styles.controlBarField}>
        <span className={styles.fieldLabel}>Rest</span>
        <div className={styles.controlBarGroup}>
          <input
            className={styles.controlBarInput}
            value={exerciseRestValue}
            inputMode="numeric"
            aria-label={`${exerciseLabel} all sets rest value`}
            onChange={(event) => {
              const restSeconds = parseRestWithUnit(event.target.value, exerciseRestUnit);
              const next = applyExerciseLevelRestToAllSets(exercise, restSeconds, exerciseRestUnit);
              onUpdate({
                designedSets: next.designedSets,
                builderPrescription: next.builderPrescription,
                prescription: next.prescription,
              });
            }}
          />
          <select
            className={styles.controlBarUnitSelect}
            value={exerciseRestUnit}
            aria-label={`${exerciseLabel} all sets rest unit`}
            onChange={(event) => {
              const restUnit = event.target.value as RestDisplayUnit;
              const restSeconds = firstSet?.restSeconds ?? null;
              const next = applyExerciseLevelRestToAllSets(exercise, restSeconds, restUnit);
              onUpdate({
                designedSets: next.designedSets,
                builderPrescription: next.builderPrescription,
                prescription: next.prescription,
              });
            }}
          >
            {REST_DISPLAY_UNITS.map((unit) => (
              <option key={unit} value={unit}>
                {unit}
              </option>
            ))}
          </select>
        </div>
      </label>

      <button
        type="button"
        className={styles.addSetButton}
        aria-label={`Add set for ${exerciseLabel}`}
        onClick={() => {
          const previousIds = exercise.designedSets.map((set) => set.setId);
          const nextSets = addDesignedSet(exercise.designedSets);
          const perSetFields = extendPerSetFieldsForSets(exercise, previousIds, nextSets);
          onUpdate({
            designedSets: nextSets,
            builderPrescription: { ...builder, perSetFields },
            prescription: { ...exercise.prescription, sets: nextSets.length },
          });
        }}
      >
        + Add set
      </button>
    </div>
  );
}

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
  const [menuOpen, setMenuOpen] = useState(false);
  const builder = resolveExerciseBuilderPrescription(exercise);
  const detailLinks = getExerciseOptionalDetailLinks();
  const summary = useMemo(
    () => buildExercisePrescriptionRowSummary(exercise.designedSets),
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
  const loadFromFirstSet = parseLoadGuidance(
    builder.loadValue
      ? formatLoadGuidance(builder.loadMode, builder.loadValue, builder.loadUnit)
      : (exercise.designedSets[0]?.loadGuidance ?? ""),
  );

  const applyBuilder = (patch: Parameters<typeof applyBuilderPatch>[1]) => {
    const next = applyBuilderPatch(exercise, patch);
    onUpdate({
      builderPrescription: next.builderPrescription,
      designedSets: next.designedSets,
      prescription: next.prescription,
    });
  };

  const applyPerSet = (setId: string, patch: Parameters<typeof applyPerSetBuilderPatch>[2]) => {
    const next = applyPerSetBuilderPatch(exercise, setId, patch);
    onUpdate({ designedSets: next.designedSets, builderPrescription: next.builderPrescription });
  };

  const handleRemoveSet = (setId: string) => {
    const previousIds = exercise.designedSets.map((set) => set.setId);
    const nextSets = removeDesignedSet(exercise.designedSets, setId);
    const perSetFields = extendPerSetFieldsForSets(exercise, previousIds, nextSets);
    onUpdate({
      designedSets: nextSets,
      builderPrescription: { ...builder, perSetFields },
      prescription: { ...exercise.prescription, sets: nextSets.length },
    });
  };

  return (
    <article
      className={styles.row}
      data-testid="exercise-prescription-row"
      data-customize-each-set={builder.customizeEachSet ? "true" : "false"}
      data-exercise-id={exercise.exerciseId ?? undefined}
    >
      <div className={styles.visualCard}>
        <div className={styles.visualTop}>
          <h4 className={styles.exerciseName}>{exerciseLabel}</h4>
          <div className={styles.menuWrap}>
            <button
              type="button"
              className={styles.menuButton}
              aria-expanded={menuOpen}
              aria-label={`Exercise actions for ${exerciseLabel}`}
              onClick={() => setMenuOpen((value) => !value)}
            >
              ⋮
            </button>
            {menuOpen ? (
              <div className={styles.menuPanel}>
                <button type="button" className={styles.menuItem} onClick={() => { onDuplicate(); setMenuOpen(false); }}>
                  Duplicate
                </button>
                {onMoveUp ? <button type="button" className={styles.menuItem} onClick={onMoveUp}>Move up</button> : null}
                {onMoveDown ? <button type="button" className={styles.menuItem} onClick={onMoveDown}>Move down</button> : null}
                {moveTargets.map((block) => (
                  <button
                    key={block.id}
                    type="button"
                    className={styles.menuItem}
                    onClick={() => { onMoveToBlock(block.id); setMenuOpen(false); }}
                  >
                    Move to {block.title}
                  </button>
                ))}
                <button type="button" className={styles.menuItemDanger} onClick={() => { onRemove(); setMenuOpen(false); }}>
                  Delete
                </button>
              </div>
            ) : null}
          </div>
        </div>

        <div className={styles.thumbnailWrap}>
          <ExerciseThumbnail source={thumbnail} size="builder" />
        </div>

        <label className={styles.exerciseNotesField}>
          <span className={styles.exerciseNotesLabel}>Exercise notes</span>
          <textarea
            className={styles.exerciseNotesInput}
            value={builder.exerciseNotes}
            rows={2}
            placeholder="Add coaching notes…"
            aria-label={`${exerciseLabel} exercise notes`}
            onChange={(event) => applyBuilder({ exerciseNotes: event.target.value })}
          />
        </label>

        <nav className={styles.detailLinks} aria-label={`Optional details for ${exerciseLabel}`}>
          {detailLinks.map((link) => (
            <button key={link.tab} type="button" className={styles.detailLink} onClick={() => onCustomize(link.tab)}>
              {link.label}
            </button>
          ))}
        </nav>
      </div>

      <div className={styles.prescriptionCard}>
        {builder.customizeEachSet ? (
          <div className={styles.perSetSection}>
            <ExerciseLevelControlBar
              exercise={exercise}
              exerciseLabel={exerciseLabel}
              summary={summary}
              onUpdate={onUpdate}
            />
            {exercise.designedSets.map((set) => (
              <PerSetRow
                key={set.setId}
                set={set}
                exercise={exercise}
                exerciseLabel={exerciseLabel}
                canDelete={exercise.designedSets.length > 1}
                onPatch={(patch) => applyPerSet(set.setId, patch)}
                onDelete={() => handleRemoveSet(set.setId)}
              />
            ))}
          </div>
        ) : (
          <div className={styles.prescriptionGrid}>
            <ExerciseLevelControlBar
              exercise={exercise}
              exerciseLabel={exerciseLabel}
              summary={summary}
              onUpdate={onUpdate}
            />
            <label className={styles.field}>
              <span className={styles.fieldLabel}>Load</span>
              <input
                className={styles.fieldInput}
                value={builder.loadValue || loadFromFirstSet.loadValue}
                aria-label={`${exerciseLabel} load value`}
                onChange={(event) => applyBuilder({ loadValue: event.target.value })}
              />
            </label>
            <label className={styles.field}>
              <span className={styles.fieldLabel}>Intensity</span>
              <div className={styles.intensityField}>
                <input
                  className={styles.fieldInput}
                  value={summary.rpeValue}
                  aria-label={`${exerciseLabel} target RPE`}
                  onChange={(event) => {
                    const rpeTarget = parseRpeTargetInput(event.target.value);
                    const next = syncExerciseGeneralPrescription(
                      { ...exercise, designedSets: exercise.designedSets.map((s) => ({ ...s, rpeTarget })) },
                      builder,
                    );
                    onUpdate({ designedSets: next.designedSets, prescription: { ...exercise.prescription, rpeTarget } });
                  }}
                />
                <span className={styles.fieldAffix}>RPE</span>
              </div>
            </label>
          </div>
        )}
      </div>
    </article>
  );
}
