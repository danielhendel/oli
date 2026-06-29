"use client";

import { useState } from "react";

import { WorkoutExerciseCardEditor } from "@/components/workout-studio/WorkoutExerciseCardEditor";
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
  const displayTitle = getBlockDisplayTitle(props.block);
  const notesPreview = blockNotesPreview(props.block.notes);

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
        onClick={props.onSelect}
        onDragOver={(event) => {
          event.preventDefault();
          event.dataTransfer.dropEffect = "copy";
        }}
        onDrop={(event) => {
          event.preventDefault();
          const raw = event.dataTransfer.getData(LIBRARY_DRAG_MIME);
          const exercise = parseLibraryDrag(raw);
          if (exercise) props.onAddExerciseFromLibrary(exercise);
        }}
      >
        <header className={styles.blockHeader}>
          <button
            type="button"
            className={styles.blockHeaderToggle}
            onClick={(event) => {
              event.stopPropagation();
              setExpanded((value) => !value);
            }}
          >
            <div className={styles.blockTitleRow}>
              <div>
                <span className={styles.blockEyebrow}>Block {props.blockIndex + 1}</span>
                <h3 className={styles.blockTitle}>{displayTitle}</h3>
                {!expanded ? (
                  <p className={styles.blockSummary}>
                    {props.block.exercises.length} exercise
                    {props.block.exercises.length === 1 ? "" : "s"}
                    {notesPreview ? ` · ${notesPreview}` : ""}
                  </p>
                ) : notesPreview ? (
                  <p className={styles.blockNotePreview}>{notesPreview}</p>
                ) : null}
              </div>
              <span className={styles.chevron}>{expanded ? "−" : "+"}</span>
            </div>
          </button>

          <div className={styles.blockActions} onClick={(event) => event.stopPropagation()}>
            <button
              type="button"
              className={notesPreview ? styles.notesButtonActive : styles.notesButton}
              onClick={() => {
                setNotesOpen(true);
              }}
            >
              Block Notes
            </button>
            <button
              type="button"
              className={styles.actionButton}
              disabled={props.blockIndex === 0}
              onClick={() => props.onMove("up")}
            >
              ↑
            </button>
            <button
              type="button"
              className={styles.actionButton}
              disabled={props.blockIndex >= props.totalBlocks - 1}
              onClick={() => props.onMove("down")}
            >
              ↓
            </button>
            <button type="button" className={styles.actionButton} onClick={props.onDuplicate}>
              Duplicate
            </button>
            <button
              type="button"
              className={confirmRemove ? styles.actionButtonDangerConfirm : styles.actionButtonDanger}
              onClick={handleRemove}
            >
              {confirmRemove ? "Confirm remove" : "Remove"}
            </button>
          </div>
        </header>

        {expanded ? (
          <div className={styles.blockBody}>
            <div className={styles.blockFields}>
              <label className={styles.field}>
                <span>Block type</span>
                <select
                  value={props.block.blockType}
                  onClick={(event) => event.stopPropagation()}
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
              {props.block.blockType === "custom" ? (
                <label className={styles.field}>
                  <span>Custom title</span>
                  <input
                    value={props.block.customTitle}
                    placeholder="Name this block"
                    onClick={(event) => event.stopPropagation()}
                    onChange={(event) => {
                      props.onUpdate({ customTitle: event.target.value });
                    }}
                  />
                </label>
              ) : null}
            </div>

            {props.block.exercises.length === 0 ? (
              <div className={styles.dropZone}>Drag exercises here or add from the library</div>
            ) : null}

            <div className={styles.exerciseStack}>
              {props.block.exercises.map((exercise, index) => (
                <div
                  key={exercise.id}
                  onClick={(event) => {
                    event.stopPropagation();
                  }}
                >
                  <WorkoutExerciseCardEditor
                    exercise={exercise}
                    otherBlocks={props.otherBlocks}
                    currentBlockId={props.block.id}
                    onOpenExperience={() => {
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
