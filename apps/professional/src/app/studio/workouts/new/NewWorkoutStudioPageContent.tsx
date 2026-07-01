"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

import { ClientExperiencePreviewPanel } from "@/components/workout-studio/ClientExperiencePreviewPanel";
import { ExerciseExperienceStudio } from "@/components/workout-studio/ExerciseExperienceStudio";
import { StudioShell } from "@/components/StudioShell";
import { WorkoutBlocksPanel } from "@/components/workout-studio/WorkoutBlocksPanel";
import { WorkoutBuilderNavigator } from "@/components/workout-studio/WorkoutBuilderNavigator";
import { WorkoutLibraryPanel } from "@/components/workout-studio/WorkoutLibraryPanel";
import { WorkoutOverviewPanel } from "@/components/workout-studio/WorkoutOverviewPanel";
import { WorkoutStatsPanel } from "@/components/workout-studio/WorkoutStatsPanel";
import { WorkoutStudioHeader } from "@/components/workout-studio/WorkoutStudioHeader";
import { buildWorkoutExperiencePreview } from "@/features/workout-studio/buildWorkoutExperiencePreview";
import { buildWorkoutProjectedVolume } from "@/features/workout-studio/buildWorkoutProjectedVolume";
import { buildWorkoutVolumeAttribution } from "@/features/workout-studio/buildWorkoutVolumeAttribution";
import { buildWorkoutQualityChecklist } from "@/features/workout-studio/buildWorkoutQualityChecklist";
import type { ExerciseExperienceRef } from "@/features/workout-studio/exerciseExperienceWorkspace";
import { resolveExerciseExperienceContext } from "@/features/workout-studio/exerciseExperienceWorkspace";
import type { WorkoutLibraryExercise } from "@/features/workout-studio/exerciseLibraryAdapter";
import {
  getDefaultWorkoutStudioMode,
  useWorkoutStudioMode,
} from "@/features/workout-studio/useWorkoutStudioMode";
import { createEmptyWorkoutExperience } from "@/features/workout-studio/workoutStudioDraft";
import { useWorkoutStudioDraft } from "@/features/workout-studio/useWorkoutStudioDraft";
import type { WorkoutBlockType } from "@/features/workout-studio/types";
import styles from "./page.module.css";

function countExercises(blocks: { exercises: unknown[] }[]): number {
  return blocks.reduce((total, block) => total + block.exercises.length, 0);
}

export default function NewWorkoutStudioPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const workoutId = searchParams.get("workoutId");
  const {
    activeWorkout,
    createWorkout,
    loadWorkout,
    saveWorkout,
    addBlock,
    updateBlock,
    duplicateBlock,
    removeBlock,
    moveBlock,
    addExerciseFromLibrary,
    addCustomExercise,
    updateExercise,
    removeExercise,
    duplicateExercise,
    moveExercise,
    moveExerciseToBlock,
    updateWorkoutMeta,
  } = useWorkoutStudioDraft();

  const [selectedBlockId, setSelectedBlockId] = useState<string | null>(null);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [selectedExerciseRef, setSelectedExerciseRef] = useState<ExerciseExperienceRef | null>(
    null,
  );
  const canvasScrollRef = useRef(0);
  const canvasColumnRef = useRef<HTMLElement>(null);
  const libraryColumnRef = useRef<HTMLElement>(null);

  const projectedVolumeLegacy = useMemo(
    () => buildWorkoutProjectedVolume(activeWorkout ?? createEmptyWorkoutExperience()),
    [activeWorkout],
  );

  const volumeAttribution = useMemo(
    () => buildWorkoutVolumeAttribution(activeWorkout ?? createEmptyWorkoutExperience()),
    [activeWorkout],
  );

  const qualityChecklist = useMemo(
    () =>
      buildWorkoutQualityChecklist(
        activeWorkout ?? createEmptyWorkoutExperience(),
        projectedVolumeLegacy,
      ),
    [activeWorkout, projectedVolumeLegacy],
  );

  const preview = useMemo(
    () => buildWorkoutExperiencePreview(activeWorkout ?? createEmptyWorkoutExperience()),
    [activeWorkout],
  );

  const exerciseExperienceContext = useMemo(
    () =>
      activeWorkout
        ? resolveExerciseExperienceContext(activeWorkout, selectedExerciseRef)
        : null,
    [activeWorkout, selectedExerciseRef],
  );

  const { activeMode, setActiveMode, isBlocksMode } = useWorkoutStudioMode(
    activeWorkout?.title ?? "",
  );

  useEffect(() => {
    if (workoutId) {
      loadWorkout(workoutId);
      return;
    }
    if (!activeWorkout) {
      const workout = createWorkout("Daniel Hendel");
      router.replace(`/studio/workouts/new?workoutId=${workout.id}`);
    }
  }, [activeWorkout, createWorkout, loadWorkout, router, workoutId]);

  useEffect(() => {
    if (!activeWorkout) return;
    setActiveMode(getDefaultWorkoutStudioMode(activeWorkout.title));
  }, [activeWorkout?.id, setActiveMode]);

  useEffect(() => {
    if (!activeWorkout) return;
    if (selectedBlockId) return;
    const first = activeWorkout.blocks[0];
    if (first) setSelectedBlockId(first.id);
  }, [activeWorkout, selectedBlockId]);

  useEffect(() => {
    if (selectedExerciseRef && !exerciseExperienceContext) {
      setSelectedExerciseRef(null);
    }
  }, [exerciseExperienceContext, selectedExerciseRef]);

  if (!activeWorkout) {
    return (
      <StudioShell wide>
        <div className={styles.loading}>Loading Workout Studio…</div>
      </StudioShell>
    );
  }

  const handleAddFromLibrary = (exercise: WorkoutLibraryExercise) => {
    const blockId = selectedBlockId ?? activeWorkout.blocks[0]?.id;
    if (!blockId) return;
    addExerciseFromLibrary(blockId, exercise);
    setSelectedBlockId(blockId);
  };

  const openExerciseExperience = (blockId: string, exerciseCardId: string) => {
    if (canvasColumnRef.current) {
      canvasScrollRef.current = canvasColumnRef.current.scrollTop;
    }
    setSelectedExerciseRef({ blockId, exerciseCardId });
  };

  const closeExerciseExperience = () => {
    setSelectedExerciseRef(null);
    setActiveMode("blocks");
    requestAnimationFrame(() => {
      if (canvasColumnRef.current) {
        canvasColumnRef.current.scrollTop = canvasScrollRef.current;
      }
    });
  };

  const exerciseCount = countExercises(activeWorkout.blocks);
  const inExperienceStudio = exerciseExperienceContext != null;

  const handleSaveStub = () => {
    saveWorkout(activeWorkout);
  };

  return (
    <StudioShell wide>
      <div className={styles.studioPage}>
        {inExperienceStudio ? (
          <div className={styles.pageHeader}>
            <div>
              <div className={styles.eyebrow}>Exercise Experience Studio</div>
              <h1 className={styles.title}>{exerciseExperienceContext.exercise.exerciseName}</h1>
              <p className={styles.subtitle}>
                Design sets, media, lesson, coaching, progression, and tracking for this exercise.
              </p>
            </div>
          </div>
        ) : (
          <WorkoutStudioHeader
            onPreview={() => {
              setPreviewOpen(true);
            }}
            onSave={handleSaveStub}
          />
        )}

        {inExperienceStudio ? (
          <ExerciseExperienceStudio
            context={exerciseExperienceContext}
            onClose={closeExerciseExperience}
            onUpdate={(patch) => {
              updateExercise(
                selectedExerciseRef!.blockId,
                selectedExerciseRef!.exerciseCardId,
                patch,
              );
            }}
          />
        ) : (
          <div
            className={`${styles.studioWorkspace} ${isBlocksMode ? "" : styles.studioWorkspaceNoLibrary}`}
            data-testid="studio-workspace"
          >
            <aside className={styles.navColumn} data-testid="studio-nav-column">
              <WorkoutBuilderNavigator
                activeMode={activeMode}
                onModeChange={setActiveMode}
                qualityScore={qualityChecklist.scorePercent}
                totalSets={projectedVolumeLegacy.totalSets}
                blockCount={activeWorkout.blocks.length}
                exerciseCount={exerciseCount}
              />
            </aside>

            <main
              ref={canvasColumnRef}
              className={styles.canvasColumn}
              data-testid="studio-canvas-column"
            >
              {activeMode === "overview" ? (
                <WorkoutOverviewPanel
                  workoutTitle={activeWorkout.title}
                  clientName={activeWorkout.clientName}
                  objective={activeWorkout.overview.objective}
                  desiredAdaptation={activeWorkout.overview.desiredAdaptation}
                  roleInHealthSystem={activeWorkout.overview.roleInHealthSystem}
                  estimatedDurationMinutes={activeWorkout.estimatedDurationMinutes}
                  difficulty={activeWorkout.difficulty}
                  onMetaChange={updateWorkoutMeta}
                />
              ) : null}

              {activeMode === "stats" ? (
                <WorkoutStatsPanel
                  attribution={volumeAttribution}
                  qualityChecklist={qualityChecklist}
                  onGoToBlocks={() => {
                    setActiveMode("blocks");
                  }}
                  onGoToOverview={() => {
                    setActiveMode("overview");
                  }}
                />
              ) : null}

              {activeMode === "blocks" ? (
                <WorkoutBlocksPanel
                  blocks={activeWorkout.blocks}
                  selectedBlockId={selectedBlockId}
                  onSelectBlock={setSelectedBlockId}
                  onAddBlock={(blockType: WorkoutBlockType) => {
                    addBlock(blockType);
                  }}
                  onUpdateBlock={updateBlock}
                  onDuplicateBlock={duplicateBlock}
                  onRemoveBlock={(blockId) => {
                    removeBlock(blockId);
                    if (selectedBlockId === blockId) setSelectedBlockId(null);
                  }}
                  onMoveBlock={moveBlock}
                  onAddExerciseFromLibrary={(blockId, exercise) => {
                    addExerciseFromLibrary(blockId, exercise);
                    setSelectedBlockId(blockId);
                  }}
                  onOpenExerciseExperience={openExerciseExperience}
                  onUpdateExercise={updateExercise}
                  onRemoveExercise={removeExercise}
                  onDuplicateExercise={duplicateExercise}
                  onMoveExercise={moveExercise}
                  onMoveExerciseToBlock={moveExerciseToBlock}
                />
              ) : null}
            </main>

            {isBlocksMode ? (
              <aside
                ref={libraryColumnRef}
                className={styles.libraryColumn}
                id="studio-library-column"
                data-testid="studio-library-column"
              >
                <WorkoutLibraryPanel
                  selectedBlockId={selectedBlockId}
                  onAddExercise={handleAddFromLibrary}
                  onAddCustomExercise={() => {
                    const blockId = selectedBlockId ?? activeWorkout.blocks[0]?.id;
                    if (!blockId) return;
                    addCustomExercise(blockId);
                    setSelectedBlockId(blockId);
                  }}
                />
              </aside>
            ) : null}
          </div>
        )}
      </div>

      <ClientExperiencePreviewPanel
        open={previewOpen}
        preview={preview}
        onClose={() => {
          setPreviewOpen(false);
        }}
      />
    </StudioShell>
  );
}
