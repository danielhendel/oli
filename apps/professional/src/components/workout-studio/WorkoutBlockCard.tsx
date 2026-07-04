"use client";

import { useState } from "react";

import { WorkoutExercisePrescriptionRow } from "@/components/workout-studio/WorkoutExercisePrescriptionRow";
import type { ExerciseCardTab } from "@/components/workout-studio/exercise-card/types";
import { BlockNotesEditor } from "@/components/workout-studio/BlockNotesEditor";
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
  onUpdate: (
    patch: Partial<
      Pick<WorkoutBlock, "customTitle" | "notes" | "blockType" | "targetSetCount" | "defaultRestSeconds">
    >,
  ) => void;
  onDuplicate: () => void;
  onRemove: () => void;
  onMove: (direction: "up" | "down") => void;
  onAddExerciseFromLibrary: (exercise: WorkoutLibraryExercise) => void;
  onOpenExerciseExperience: (exerciseCardId: string, initialTab?: ExerciseCardTab) => void;
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
  const [menuOpen, setMenuOpen] = useState(false);
  const displayTitle = getBlockDisplayTitle(props.block);
  const blockLabel = `Block ${props.blockIndex + 1}`;

  const handleRemove = () => {
    if (!confirmRemove) {
      setConfirmRemove(true);
      setMenuOpen(false);
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
        <header className={`${styles.blockHeader} ${styles.blockHeaderSurface}`} onClick={(event) => event.stopPropagation()}>
          <div className={styles.headerLeft}>
            <button
              type="button"
              className={styles.collapseButton}
              aria-expanded={expanded}
              aria-label={expanded ? `Collapse ${blockLabel}` : `Expand ${blockLabel}`}
              onClick={() => setExpanded((value) => !value)}
            >
              {expanded ? "▾" : "▸"}
            </button>

            <label className={styles.headerField}>
              <span className={styles.headerFieldLabel}>Type</span>
              <select
                className={styles.headerSelect}
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

          <div className={styles.blockHeaderActions}>
            <div className={styles.blockMoveControls}>
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
            </div>
            <div className={styles.blockMenuControl}>
              <div className={styles.menuWrap}>
                <button
                  type="button"
                  className={styles.menuButton}
                  aria-expanded={menuOpen}
                  aria-label={`Block actions for ${blockLabel}`}
                  onClick={() => setMenuOpen((value) => !value)}
                >
                  ⋮
                </button>
                {menuOpen ? (
                  <div className={styles.menuPanel}>
                  <button
                    type="button"
                    className={styles.menuItem}
                    onClick={() => {
                      props.onDuplicate();
                      setMenuOpen(false);
                    }}
                  >
                    Duplicate block
                  </button>
                  <button
                    type="button"
                    className={styles.menuItem}
                    onClick={() => {
                      setNotesOpen(true);
                      setMenuOpen(false);
                    }}
                  >
                    Block notes
                  </button>
                  <button
                    type="button"
                    className={styles.menuItem}
                    onClick={() => {
                      setExpanded((value) => !value);
                      setMenuOpen(false);
                    }}
                  >
                    {expanded ? "Collapse" : "Expand"}
                  </button>
                  <button
                    type="button"
                    className={confirmRemove ? styles.menuItemDangerConfirm : styles.menuItemDanger}
                    onClick={handleRemove}
                  >
                    {confirmRemove ? "Confirm delete" : "Delete block"}
                  </button>
                </div>
              ) : null}
              </div>
            </div>
          </div>
        </header>

        {expanded ? (
          <div className={styles.blockBody}>
            {props.block.blockType === "custom" ? (
              <input
                className={styles.customTitleInput}
                value={props.block.customTitle}
                placeholder="Custom block name"
                aria-label={`Custom title for ${blockLabel}`}
                onClick={(event) => event.stopPropagation()}
                onChange={(event) => {
                  props.onUpdate({ customTitle: event.target.value });
                }}
              />
            ) : null}

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
                    onCustomize={(initialTab) => {
                      props.onOpenExerciseExperience(exercise.id, initialTab);
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
        ) : (
          <p className={styles.collapsedSummary}>
            {displayTitle} · {props.block.exercises.length} exercise
            {props.block.exercises.length === 1 ? "" : "s"}
          </p>
        )}
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
