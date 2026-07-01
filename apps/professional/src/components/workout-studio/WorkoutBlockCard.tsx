"use client";

import { useState } from "react";

import { WorkoutExercisePrescriptionRow } from "@/components/workout-studio/WorkoutExercisePrescriptionRow";
import { BlockNotesEditor } from "@/components/workout-studio/BlockNotesEditor";
import { blockNotesPreview } from "@/features/workout-studio/blockNotesUtils";
import { LIBRARY_DRAG_MIME } from "@/components/workout-studio/WorkoutLibraryPanel";
import { getBlockDisplayTitle } from "@/features/workout-studio/blockUtils";
import type { WorkoutLibraryExercise } from "@/features/workout-studio/exerciseLibraryAdapter";
import type { WorkoutBlock, WorkoutBlockType, WorkoutExerciseCard } from "@/features/workout-studio/types";
import { WORKOUT_BLOCK_TYPES, WORKOUT_BLOCK_TYPE_LABELS } from "@/features/workout-studio/types";
import styles from "./WorkoutBlockCard.module.css";

type WorkoutBlockCardProps = {
  block: WorkoutBlock;
  blockIndex: number;
  totalBlocks: number;
  isSelected: boolean;
  otherBlocks: { id: string; title: string }[];
  onSelect: () => void;
  onUpdate: (patch: Partial<Pick<WorkoutBlock, "customTitle" | "notes" | "blockType">>) => void;
  onDuplicate: () => void;
  onRemove: () => void;
  onMove: (direction: "up" | "down") => void;
  onAddExerciseFromLibrary: (exercise: WorkoutLibraryExercise) => void;
  onOpenExerciseExperience: (exerciseCardId: string) => void;
  onUpdateExercise: (exerciseId: string, patch: Partial<WorkoutExerciseCard>) => void;
  onRemoveExercise: (exerciseId: string) => void;
  onDuplicateExercise: (exerciseId: string) => void;
  onMoveExercise: (exerciseId: string, direction: "up" | "down") => void;
  onMoveExerciseToBlock: (exerciseId: string, targetBlockId: string) => void;
};

function parseLibraryDrag(data: string): WorkoutLibraryExercise | null {
  try {
    return JSON.parse(data) as WorkoutLibraryExercise;
  } catch {
    return null;
  }
}

export function WorkoutBlockCard(props: WorkoutBlockCardProps) {
  const [expanded, setExpanded] = useState(true);
  const [confirmRemove, setConfirmRemove] = useState(false);
  const [notesOpen, setNotesOpen] = useState(false);
  const [moreOpen, setMoreOpen] = useState(false);
  const displayTitle = getBlockDisplayTitle(props.block);
  const notesPreview = blockNotesPreview(props.block.notes);
  const blockLabel = `Block ${props.blockIndex + 1}`;

  const handleRemove = () => {
    if (!confirmRemove) {
      setConfirmRemove(true);
      return;
    }
    props.onRemove();
    setConfirmRemove(false);
  };

  return (
    <>
      <article
        className={`${styles.blockCard} ${props.isSelected ? styles.blockCardActive : ""} ${
          expanded ? styles.blockCardExpanded : styles.blockCardCollapsed
        }`}
        data-selected={props.isSelected ? "true" : "false"}
        onClick={props.onSelect}
        onDragOver={(event) => {
          event.preventDefault();
          if (!props.isSelected) {
            props.onSelect();
          }
          event.dataTransfer.dropEffect = "copy";
        }}
        onDrop={(event) => {
          event.preventDefault();
          const raw = event.dataTransfer.getData(LIBRARY_DRAG_MIME);
          const exercise = parseLibraryDrag(raw);
          if (exercise) props.onAddExerciseFromLibrary(exercise);
        }}
      >
        <div className={styles.topRow}>
          <div className={styles.compactControls} onClick={(event) => event.stopPropagation()}>
            <button
              type="button"
              className={styles.iconButton}
              disabled={props.blockIndex === 0}
              aria-label={`Move ${blockLabel} up`}
              onClick={() => props.onMove("up")}
            >
              ↑
            </button>
            <button
              type="button"
              className={styles.iconButton}
              disabled={props.blockIndex >= props.totalBlocks - 1}
              aria-label={`Move ${blockLabel} down`}
              onClick={() => props.onMove("down")}
            >
              ↓
            </button>
            <button
              type="button"
              className={confirmRemove ? styles.iconButtonDangerConfirm : styles.iconButtonDanger}
              aria-label={confirmRemove ? `Confirm delete ${blockLabel}` : `Delete ${blockLabel}`}
              onClick={handleRemove}
            >
              {confirmRemove ? "✓" : "×"}
            </button>
          </div>

          <div className={styles.topRowRight} onClick={(event) => event.stopPropagation()}>
            {props.isSelected ? <span className={styles.selectedBadge}>Selected</span> : null}
            <div className={styles.moreMenu}>
              <button
                type="button"
                className={styles.moreButton}
                aria-expanded={moreOpen}
                aria-label={`More actions for ${blockLabel}`}
                onClick={() => setMoreOpen((value) => !value)}
              >
                More
              </button>
              {moreOpen ? (
                <div className={styles.morePanel}>
                  <button
                    type="button"
                    className={styles.moreItem}
                    onClick={() => {
                      props.onDuplicate();
                      setMoreOpen(false);
                    }}
                  >
                    Duplicate block
                  </button>
                  <button
                    type="button"
                    className={styles.moreItem}
                    onClick={() => {
                      setNotesOpen(true);
                      setMoreOpen(false);
                    }}
                  >
                    Block notes
                  </button>
                  <button
                    type="button"
                    className={styles.moreItem}
                    onClick={() => {
                      setExpanded((value) => !value);
                      setMoreOpen(false);
                    }}
                  >
                    {expanded ? "Collapse" : "Expand"}
                  </button>
                </div>
              ) : null}
            </div>
          </div>
        </div>

        <button
          type="button"
          className={styles.titleRow}
          onClick={(event) => {
            event.stopPropagation();
            props.onSelect();
          }}
        >
          <span className={styles.blockIndex}>{blockLabel}</span>
          <h3 className={styles.blockTitle}>{displayTitle}</h3>
          {!expanded ? (
            <span className={styles.blockSummary}>
              {props.block.exercises.length} exercise{props.block.exercises.length === 1 ? "" : "s"}
            </span>
          ) : null}
        </button>

        {notesPreview && expanded ? (
          <p className={styles.blockNotePreview}>{notesPreview}</p>
        ) : null}

        {expanded ? (
          <div className={styles.blockBody}>
            <div className={styles.typeRow} onClick={(event) => event.stopPropagation()}>
              {props.block.blockType === "custom" ? (
                <input
                  className={styles.customTitleInput}
                  value={props.block.customTitle}
                  placeholder="Custom block name"
                  aria-label={`Custom title for ${blockLabel}`}
                  onChange={(event) => {
                    props.onUpdate({ customTitle: event.target.value });
                  }}
                />
              ) : (
                <span className={styles.typeSpacer} />
              )}
              <label className={styles.typeSelectWrap}>
                <span className={styles.typeSelectLabel}>Block type</span>
                <select
                  className={styles.typeSelect}
                  value={props.block.blockType}
                  aria-label={`Block type for ${blockLabel}`}
                  onChange={(event) => {
                    props.onUpdate({ blockType: event.target.value as WorkoutBlockType });
                  }}
                >
                  {WORKOUT_BLOCK_TYPES.map((blockType) => (
                    <option key={blockType} value={blockType}>
                      {WORKOUT_BLOCK_TYPE_LABELS[blockType]}
                    </option>
                  ))}
                </select>
              </label>
            </div>

            {props.block.exercises.length === 0 ? (
              <div
                className={`${styles.dropZone} ${props.isSelected ? styles.dropZoneActive : ""}`}
              >
                {props.isSelected
                  ? "Drop exercises here or add from the library"
                  : "Select this block to add exercises"}
              </div>
            ) : null}

            <div className={styles.exerciseStack}>
              {props.block.exercises.map((exercise, index) => (
                <div
                  key={exercise.id}
                  onClick={(event) => {
                    event.stopPropagation();
                  }}
                >
                  <WorkoutExercisePrescriptionRow
                    exercise={exercise}
                    otherBlocks={props.otherBlocks}
                    currentBlockId={props.block.id}
                    onUpdate={(patch) => {
                      props.onUpdateExercise(exercise.id, patch);
                    }}
                    onCustomize={() => {
                      props.onOpenExerciseExperience(exercise.id);
                    }}
                    onRemove={() => {
                      props.onRemoveExercise(exercise.id);
                    }}
                    onDuplicate={() => {
                      props.onDuplicateExercise(exercise.id);
                    }}
                    onMoveUp={
                      index > 0
                        ? () => {
                            props.onMoveExercise(exercise.id, "up");
                          }
                        : undefined
                    }
                    onMoveDown={
                      index < props.block.exercises.length - 1
                        ? () => {
                            props.onMoveExercise(exercise.id, "down");
                          }
                        : undefined
                    }
                    onMoveToBlock={(targetBlockId) => {
                      props.onMoveExerciseToBlock(exercise.id, targetBlockId);
                    }}
                  />
                </div>
              ))}
            </div>
          </div>
        ) : null}
      </article>

      <BlockNotesEditor
        open={notesOpen}
        notes={props.block.notes}
        blockTitle={displayTitle}
        onSave={(notes) => {
          props.onUpdate({ notes });
        }}
        onClose={() => {
          setNotesOpen(false);
        }}
      />
    </>
  );
}
