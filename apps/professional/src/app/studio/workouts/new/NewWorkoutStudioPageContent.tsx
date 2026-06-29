"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

import { ClientExperiencePreviewPanel } from "@/components/workout-studio/ClientExperiencePreviewPanel";
import { ExerciseExperienceStudio } from "@/components/workout-studio/ExerciseExperienceStudio";
import { StudioShell } from "@/components/StudioShell";
import { WorkoutAuthorCanvas } from "@/components/workout-studio/WorkoutAuthorCanvas";
import { WorkoutBuilderNavigator } from "@/components/workout-studio/WorkoutBuilderNavigator";
import { WorkoutLibraryPanel } from "@/components/workout-studio/WorkoutLibraryPanel";
import { buildWorkoutExperiencePreview } from "@/features/workout-studio/buildWorkoutExperiencePreview";
import { buildWorkoutProjectedVolume } from "@/features/workout-studio/buildWorkoutProjectedVolume";
import { buildWorkoutVolumeAttribution } from "@/features/workout-studio/buildWorkoutVolumeAttribution";
import { buildWorkoutQualityChecklist } from "@/features/workout-studio/buildWorkoutQualityChecklist";
import type { ExerciseExperienceRef } from "@/features/workout-studio/exerciseExperienceWorkspace";
import { resolveExerciseExperienceContext } from "@/features/workout-studio/exerciseExperienceWorkspace";
import type { WorkoutLibraryExercise } from "@/features/workout-studio/exerciseLibraryAdapter";
import { useWorkoutStudioNavigation } from "@/features/workout-studio/useWorkoutStudioNavigation";
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
  const { activeSection, sectionRefs, scrollToSection } = useWorkoutStudioNavigation(libraryColumnRef);

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
    requestAnimationFrame(() => {
      if (canvasColumnRef.current) {
        canvasColumnRef.current.scrollTop = canvasScrollRef.current;
      }
    });
  };

  const exerciseCount = countExercises(activeWorkout.blocks);
  const inExperienceStudio = exerciseExperienceContext != null;

  return (
    <StudioShell wide>
      <div className={styles.studioPage}>
        <div className={styles.pageHeader}>
          <div>
            <div className={styles.eyebrow}>
              {inExperienceStudio ? "Exercise Experience Studio" : "Workout Architecture Studio"}
            </div>
            <h1 className={styles.title}>
              {inExperienceStudio
                ? exerciseExperienceContext.exercise.exerciseName
                : "Author Canvas"}
            </h1>
            <p className={styles.subtitle}>
              {inExperienceStudio
                ? "Design sets, media, lesson, coaching, progression, and tracking for this exercise."
                : "Compose the workout at the workout level — open any exercise to design its client experience deeply."}
            </p>
          </div>
          {!inExperienceStudio ? (
            <button
              type="button"
              className={styles.previewButton}
              onClick={() => {
                setPreviewOpen(true);
              }}
            >
              Preview Client Experience
            </button>
          ) : null}
        </div>

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
          <div className={styles.studioWorkspace} data-testid="studio-workspace">
            <aside className={styles.navColumn} data-testid="studio-nav-column">
              <WorkoutBuilderNavigator
                qualityChecklist={qualityChecklist}
                qualityRef={sectionRefs.qualityRef}
                totalSets={projectedVolumeLegacy.totalSets}
                blockCount={activeWorkout.blocks.length}
                exerciseCount={exerciseCount}
                activeSection={activeSection}
                onNavigate={scrollToSection}
                onPreview={() => {
                  setPreviewOpen(true);
                }}
              />
            </aside>

            <main
              ref={canvasColumnRef}
              className={styles.canvasColumn}
              data-testid="studio-canvas-column"
            >
              <WorkoutAuthorCanvas
                workoutTitle={activeWorkout.title}
                objective={activeWorkout.overview.objective}
                desiredAdaptation={activeWorkout.overview.desiredAdaptation}
                roleInHealthSystem={activeWorkout.overview.roleInHealthSystem}
                estimatedDurationMinutes={activeWorkout.estimatedDurationMinutes}
                difficulty={activeWorkout.difficulty}
                blocks={activeWorkout.blocks}
                projectedVolume={volumeAttribution}
                selectedBlockId={selectedBlockId}
                sectionRefs={sectionRefs}
                onSelectBlock={setSelectedBlockId}
                onMetaChange={updateWorkoutMeta}
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
            </main>

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
