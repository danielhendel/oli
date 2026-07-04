"use client";

import { useMemo } from "react";

import { AddBlockInline } from "@/components/workout-studio/AddBlockInline";
import { WorkoutBlockCard } from "@/components/workout-studio/WorkoutBlockCard";
import { getBlockDisplayTitle } from "@/features/workout-studio/blockUtils";
import type { WorkoutLibraryExercise } from "@/features/workout-studio/exerciseLibraryAdapter";
import type { ExerciseCardTab } from "@/components/workout-studio/exercise-card/types";
import type { WorkoutBlock, WorkoutBlockType, WorkoutExerciseCard } from "@/features/workout-studio/types";
import styles from "./WorkoutAuthorCanvas.module.css";

type WorkoutBlocksPanelProps = {
  blocks: WorkoutBlock[];
  selectedBlockId: string | null;
  onSelectBlock: (blockId: string) => void;
  onAddBlock: (blockType: WorkoutBlockType) => void;
  onUpdateBlock: (
    blockId: string,
    patch: Partial<
      Pick<
        WorkoutBlock,
        "customTitle" | "notes" | "blockType" | "targetSetCount" | "defaultRestSeconds"
      >
    >,
  ) => void;
  onDuplicateBlock: (blockId: string) => void;
  onRemoveBlock: (blockId: string) => void;
  onMoveBlock: (blockId: string, direction: "up" | "down") => void;
  onAddExerciseFromLibrary: (blockId: string, exercise: WorkoutLibraryExercise) => void;
  onOpenExerciseExperience: (blockId: string, exerciseCardId: string, initialTab?: ExerciseCardTab) => void;
  onUpdateExercise: (
    blockId: string,
    exerciseId: string,
    patch: Partial<WorkoutExerciseCard>,
  ) => void;
  onRemoveExercise: (blockId: string, exerciseId: string) => void;
  onDuplicateExercise: (blockId: string, exerciseId: string) => void;
  onMoveExercise: (blockId: string, exerciseId: string, direction: "up" | "down") => void;
  onMoveExerciseToBlock: (fromBlockId: string, toBlockId: string, exerciseId: string) => void;
};

export function WorkoutBlocksPanel(props: WorkoutBlocksPanelProps) {
  const otherBlockOptions = useMemo(
    () =>
      props.blocks.map((block) => ({
        id: block.id,
        title: getBlockDisplayTitle(block),
      })),
    [props.blocks],
  );

  return (
    <section
      id="studio-blocks"
      className={styles.blocksRegion}
      data-testid="studio-blocks-panel"
      aria-label="Workout builder"
    >
      <div className={styles.blocksStack}>
        {props.blocks.length === 0 ? (
          <div className={styles.emptyState}>
            <div className={styles.emptyTitle}>Start with a block</div>
            <p>Add a block, then drag exercises from the Workout Library on the right.</p>
            <AddBlockInline centered onAddBlock={props.onAddBlock} />
          </div>
        ) : (
          <>
            {props.blocks.map((block, index) => (
              <WorkoutBlockCard
                key={block.id}
                block={block}
                blockIndex={index}
                totalBlocks={props.blocks.length}
                isSelected={props.selectedBlockId === block.id}
                otherBlocks={otherBlockOptions}
                onSelect={() => {
                  props.onSelectBlock(block.id);
                }}
                onUpdate={(patch) => {
                  props.onUpdateBlock(block.id, patch);
                }}
                onDuplicate={() => {
                  props.onDuplicateBlock(block.id);
                }}
                onRemove={() => {
                  props.onRemoveBlock(block.id);
                }}
                onMove={(direction) => {
                  props.onMoveBlock(block.id, direction);
                }}
                onAddExerciseFromLibrary={(exercise) => {
                  props.onAddExerciseFromLibrary(block.id, exercise);
                }}
                onOpenExerciseExperience={(exerciseCardId, initialTab) => {
                  props.onOpenExerciseExperience(block.id, exerciseCardId, initialTab);
                }}
                onUpdateExercise={(exerciseId, patch) => {
                  props.onUpdateExercise(block.id, exerciseId, patch);
                }}
                onRemoveExercise={(exerciseId) => {
                  props.onRemoveExercise(block.id, exerciseId);
                }}
                onDuplicateExercise={(exerciseId) => {
                  props.onDuplicateExercise(block.id, exerciseId);
                }}
                onMoveExercise={(exerciseId, direction) => {
                  props.onMoveExercise(block.id, exerciseId, direction);
                }}
                onMoveExerciseToBlock={(exerciseId, targetBlockId) => {
                  props.onMoveExerciseToBlock(block.id, targetBlockId, exerciseId);
                }}
              />
            ))}
            <AddBlockInline onAddBlock={props.onAddBlock} />
          </>
        )}
      </div>
    </section>
  );
}
