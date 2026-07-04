"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

import { ClientExperiencePreviewPanel } from "@/components/workout-studio/ClientExperiencePreviewPanel";
import { ExerciseExperienceStudio } from "@/components/workout-studio/ExerciseExperienceStudio";
import { StudioShell } from "@/components/StudioShell";
import { WorkoutBlocksPanel } from "@/components/workout-studio/WorkoutBlocksPanel";
import { WorkoutBuilderTabs } from "@/components/workout-studio/WorkoutBuilderTabs";
import { WorkoutLibraryPanel } from "@/components/workout-studio/WorkoutLibraryPanel";
import { WorkoutOverviewPanel } from "@/components/workout-studio/WorkoutOverviewPanel";
import { WorkoutStatsPanel } from "@/components/workout-studio/WorkoutStatsPanel";
import { WorkoutStudioActions } from "@/components/workout-studio/WorkoutStudioActions";
import { WorkoutStudioHeader } from "@/components/workout-studio/WorkoutStudioHeader";
import { buildWorkoutExperiencePreview } from "@/features/workout-studio/buildWorkoutExperiencePreview";
import { buildWorkoutProjectedVolume } from "@/features/workout-studio/buildWorkoutProjectedVolume";
import { buildWorkoutVolumeAttribution } from "@/features/workout-studio/buildWorkoutVolumeAttribution";
import { buildWorkoutQualityChecklist } from "@/features/workout-studio/buildWorkoutQualityChecklist";
import type { ExerciseCardTab } from "@/components/workout-studio/exercise-card/types";
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

  const { activeMode, setActiveMode } = useWorkoutStudioMode(
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
    setActiveMode("blocks");
    const blockId = selectedBlockId ?? activeWorkout.blocks[0]?.id;
    if (!blockId) return;
    addExerciseFromLibrary(blockId, exercise);
    setSelectedBlockId(blockId);
  };

  const openExerciseExperience = (
    blockId: string,
    exerciseCardId: string,
    initialTab?: ExerciseCardTab,
  ) => {
    if (canvasColumnRef.current) {
      canvasScrollRef.current = canvasColumnRef.current.scrollTop;
    }
    setSelectedExerciseRef({ blockId, exerciseCardId, initialTab });
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
          <>
            <div
              className={styles.studioControlRow}
              data-testid="studio-control-row"
              aria-label="Workout studio controls"
            >
              <WorkoutStudioHeader />
              <WorkoutBuilderTabs activeMode={activeMode} onModeChange={setActiveMode} />
              <WorkoutStudioActions
                onPreview={() => {
                  setPreviewOpen(true);
                }}
                onSave={handleSaveStub}
              />
            </div>

            <div className={styles.studioWorkspaceTwoColumn} data-testid="studio-workspace">
              <main
                ref={canvasColumnRef}
                className={styles.workoutBuilderColumn}
                data-testid="studio-canvas-column"
              >
              {activeMode === "overview" ? (
                <div
                  id="studio-tabpanel-overview"
                  role="tabpanel"
                  aria-labelledby="studio-tab-overview"
                >
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
                </div>
              ) : null}

              {activeMode === "stats" ? (
                <div
                  id="studio-tabpanel-stats"
                  role="tabpanel"
                  aria-labelledby="studio-tab-stats"
                >
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
                </div>
              ) : null}

              {activeMode === "blocks" ? (
                <div
                  id="studio-tabpanel-blocks"
                  role="tabpanel"
                  aria-labelledby="studio-tab-blocks"
                >
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
                </div>
              ) : null}
            </main>

            <aside
              ref={libraryColumnRef}
              className={styles.exerciseLibraryColumn}
              id="studio-library-column"
              data-testid="studio-library-column"
            >
              <WorkoutLibraryPanel
                selectedBlockId={selectedBlockId}
                onAddExercise={handleAddFromLibrary}
                onAddCustomExercise={() => {
                  setActiveMode("blocks");
                  const blockId = selectedBlockId ?? activeWorkout.blocks[0]?.id;
                  if (!blockId) return;
                  addCustomExercise(blockId);
                  setSelectedBlockId(blockId);
                }}
              />
            </aside>
            </div>
          </>
        )}

        {inExperienceStudio ? (
          <ExerciseExperienceStudio
            context={exerciseExperienceContext}
            initialTab={selectedExerciseRef?.initialTab}
            onClose={closeExerciseExperience}
            onUpdate={(patch) => {
              updateExercise(
                selectedExerciseRef!.blockId,
                selectedExerciseRef!.exerciseCardId,
                patch,
              );
            }}
          />
        ) : null}
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
