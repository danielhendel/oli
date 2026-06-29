"use client";

import { useMemo, useState } from "react";

import { AddBlockInline } from "@/components/workout-studio/AddBlockInline";
import { ProjectedVolumeCard } from "@/components/workout-studio/ProjectedVolumeCard";
import { WorkoutBlockCard } from "@/components/workout-studio/WorkoutBlockCard";
import { getBlockDisplayTitle } from "@/features/workout-studio/blockUtils";
import type { WorkoutVolumeAttribution } from "@/features/workout-studio/buildWorkoutVolumeAttribution";
import type { WorkoutLibraryExercise } from "@/features/workout-studio/exerciseLibraryAdapter";
import type { WorkoutBlock, WorkoutBlockType, WorkoutExerciseCard } from "@/features/workout-studio/types";
import styles from "./WorkoutAuthorCanvas.module.css";

type SectionRefs = {
  overviewRef: React.RefObject<HTMLDivElement | null>;
  volumeRef: React.RefObject<HTMLDivElement | null>;
  qualityRef: React.RefObject<HTMLDivElement | null>;
  blocksRef: React.RefObject<HTMLDivElement | null>;
  toolsRef: React.RefObject<HTMLDivElement | null>;
};

type WorkoutAuthorCanvasProps = {
  workoutTitle: string;
  objective: string;
  desiredAdaptation: string;
  roleInHealthSystem: string;
  estimatedDurationMinutes: number | null;
  difficulty: string;
  blocks: WorkoutBlock[];
  projectedVolume: WorkoutVolumeAttribution;
  selectedBlockId: string | null;
  sectionRefs: SectionRefs;
  onSelectBlock: (blockId: string) => void;
  onMetaChange: (patch: {
    title?: string;
    objective?: string;
    desiredAdaptation?: string;
    roleInHealthSystem?: string;
    estimatedDurationMinutes?: number | null;
    difficulty?: "beginner" | "intermediate" | "advanced" | "elite";
  }) => void;
  onAddBlock: (blockType: WorkoutBlockType) => void;
  onUpdateBlock: (
    blockId: string,
    patch: Partial<Pick<WorkoutBlock, "customTitle" | "notes" | "blockType">>,
  ) => void;
  onDuplicateBlock: (blockId: string) => void;
  onRemoveBlock: (blockId: string) => void;
  onMoveBlock: (blockId: string, direction: "up" | "down") => void;
  onAddExerciseFromLibrary: (blockId: string, exercise: WorkoutLibraryExercise) => void;
  onOpenExerciseExperience: (blockId: string, exerciseCardId: string) => void;
  onUpdateExercise: (
    blockId: string,
    exerciseId: string,
    patch: Partial<WorkoutExerciseCard>,
  ) => void;
  onRemoveExercise: (blockId: string, exerciseId: string) => void;
  onDuplicateExercise: (blockId: string, exerciseId: string) => void;
  onMoveExercise: (blockId: string, exerciseId: string, direction: "up" | "down") => void;
  onMoveExerciseToBlock: (
    fromBlockId: string,
    toBlockId: string,
    exerciseId: string,
  ) => void;
};

export function WorkoutAuthorCanvas(props: WorkoutAuthorCanvasProps) {
  const [overviewExpanded, setOverviewExpanded] = useState(true);
  const { overviewRef, volumeRef, blocksRef, toolsRef } = props.sectionRefs;

  const otherBlockOptions = useMemo(
    () =>
      props.blocks.map((block) => ({
        id: block.id,
        title: getBlockDisplayTitle(block),
      })),
    [props.blocks],
  );

  return (
    <div className={styles.canvasColumn}>
      <div ref={overviewRef} id="studio-overview" className={styles.overviewCard}>
        <button
          type="button"
          className={styles.overviewToggle}
          onClick={() => {
            setOverviewExpanded((value) => !value);
          }}
        >
          <div>
            <div className={styles.panelEyebrow}>Workout Overview</div>
            <h2 className={styles.overviewTitle}>{props.workoutTitle || "Untitled workout"}</h2>
            {!overviewExpanded ? (
              <p className={styles.overviewSummary}>
                {props.objective || "No objective yet"} · {props.estimatedDurationMinutes ?? "—"}{" "}
                min · {props.difficulty}
              </p>
            ) : null}
          </div>
          <span className={styles.chevron}>{overviewExpanded ? "−" : "+"}</span>
        </button>

        {overviewExpanded ? (
          <div className={styles.fieldGrid}>
            <label className={styles.field}>
              <span>Title</span>
              <input
                value={props.workoutTitle}
                onChange={(event) => {
                  props.onMetaChange({ title: event.target.value });
                }}
              />
            </label>
            <label className={styles.field}>
              <span>Estimated duration (minutes)</span>
              <input
                type="number"
                value={props.estimatedDurationMinutes ?? ""}
                onChange={(event) => {
                  const value = event.target.value;
                  props.onMetaChange({
                    estimatedDurationMinutes: value ? Number(value) : null,
                  });
                }}
              />
            </label>
            <label className={styles.field}>
              <span>Difficulty</span>
              <select
                value={props.difficulty}
                onChange={(event) => {
                  props.onMetaChange({
                    difficulty: event.target.value as
                      | "beginner"
                      | "intermediate"
                      | "advanced"
                      | "elite",
                  });
                }}
              >
                <option value="beginner">Beginner</option>
                <option value="intermediate">Intermediate</option>
                <option value="advanced">Advanced</option>
                <option value="elite">Elite</option>
              </select>
            </label>
            <label className={`${styles.field} ${styles.full}`}>
              <span>Objective</span>
              <textarea
                value={props.objective}
                onChange={(event) => {
                  props.onMetaChange({ objective: event.target.value });
                }}
              />
            </label>
            <label className={`${styles.field} ${styles.full}`}>
              <span>Desired adaptation</span>
              <textarea
                value={props.desiredAdaptation}
                onChange={(event) => {
                  props.onMetaChange({ desiredAdaptation: event.target.value });
                }}
              />
            </label>
            <label className={`${styles.field} ${styles.full}`}>
              <span>Role in health system</span>
              <textarea
                value={props.roleInHealthSystem}
                onChange={(event) => {
                  props.onMetaChange({ roleInHealthSystem: event.target.value });
                }}
              />
            </label>
          </div>
        ) : null}
      </div>

      <div ref={volumeRef}>
        <ProjectedVolumeCard attribution={props.projectedVolume} />
      </div>

      <div ref={blocksRef} id="studio-blocks" className={styles.blocksRegion}>
        <div className={styles.blocksHeading}>
          <div className={styles.panelEyebrow}>Workout Canvas</div>
          <h2 className={styles.panelTitle}>Design your blocks</h2>
          <p className={styles.toolbarHint}>
            Structure the session and compose exercise experiences — open any exercise to design deeply.
          </p>
        </div>

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
                  onOpenExerciseExperience={(exerciseCardId) => {
                    props.onOpenExerciseExperience(block.id, exerciseCardId);
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
      </div>

      <div ref={toolsRef} id="studio-tools" className={styles.toolsPanel}>
        <div className={styles.panelEyebrow}>Notes / Tools</div>
        <p className={styles.toolbarHint}>
          Client context and advanced assignment tools will live here in a future sprint.
        </p>
      </div>
    </div>
  );
}
