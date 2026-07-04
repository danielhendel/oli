"use client";

import { useMemo, useState } from "react";

import { ExerciseThumbnail } from "@/components/workout-studio/ExerciseThumbnail";
import { resolveExerciseThumbnail } from "@/features/workout-studio/resolveExerciseThumbnail";
import {
  WORKOUT_LIBRARY_FILTER_LABELS,
  WORKOUT_LIBRARY_FILTERS,
  filterWorkoutLibraryExercises,
  listCanonicalWorkoutLibraryExercises,
  type WorkoutLibraryExercise,
  type WorkoutLibraryFilter,
} from "@/features/workout-studio/exerciseLibraryAdapter";
import styles from "./WorkoutLibraryPanel.module.css";

export const LIBRARY_DRAG_MIME = "application/x-oli-library-exercise";

type WorkoutLibraryPanelProps = {
  selectedBlockId: string | null;
  onAddExercise: (exercise: WorkoutLibraryExercise) => void;
  onAddCustomExercise: () => void;
};

type LibraryViewMode = "card" | "list";

export function WorkoutLibraryPanel({
  selectedBlockId,
  onAddExercise,
  onAddCustomExercise,
}: WorkoutLibraryPanelProps) {
  const [filter, setFilter] = useState<WorkoutLibraryFilter>("all");
  const [search, setSearch] = useState("");
  const [viewMode, setViewMode] = useState<LibraryViewMode>("card");

  const catalog = useMemo(() => listCanonicalWorkoutLibraryExercises(), []);
  const filtered = useMemo(
    () => filterWorkoutLibraryExercises(catalog, filter, search),
    [catalog, filter, search],
  );

  return (
    <aside
      id="studio-exercise-library"
      className={styles.panel}
      aria-label="Workout library"
      data-testid="workout-library-panel"
    >
      <div className={styles.libraryControls}>
        <div className={styles.eyebrow}>Workout Library</div>

        <input
          className={styles.search}
          value={search}
          onChange={(event) => {
            setSearch(event.target.value);
          }}
          placeholder="Search exercises, muscles, equipment…"
          aria-label="Search workout library"
        />

        <div className={styles.toolbar}>
          <div className={styles.chips} role="tablist" aria-label="Exercise filters">
            {WORKOUT_LIBRARY_FILTERS.map((chip) => (
              <button
                key={chip}
                type="button"
                role="tab"
                aria-selected={filter === chip}
                className={filter === chip ? styles.chipActive : styles.chip}
                onClick={() => {
                  setFilter(chip);
                }}
              >
                {WORKOUT_LIBRARY_FILTER_LABELS[chip]}
              </button>
            ))}
          </div>
          <div className={styles.viewToggle} role="group" aria-label="Library view mode">
            <button
              type="button"
              className={viewMode === "card" ? styles.viewButtonActive : styles.viewButton}
              aria-pressed={viewMode === "card"}
              onClick={() => setViewMode("card")}
            >
              Cards
            </button>
            <button
              type="button"
              className={viewMode === "list" ? styles.viewButtonActive : styles.viewButton}
              aria-pressed={viewMode === "list"}
              onClick={() => setViewMode("list")}
            >
              List
            </button>
          </div>
        </div>
      </div>

      <div
        className={styles.libraryResults}
        aria-label="Exercise library results"
        data-testid="library-results-scroll"
      >
        <div className={viewMode === "list" ? styles.listView : styles.cardGrid}>
        {filtered.slice(0, 80).map((exercise) => {
          const thumbnail = resolveExerciseThumbnail({
            exerciseId: exercise.exerciseId,
            exerciseName: exercise.name,
            primaryMuscle: exercise.primaryMuscles[0],
            equipment: exercise.equipment,
          });

          if (viewMode === "list") {
            return (
              <article
                key={exercise.exerciseId}
                className={styles.listRow}
                draggable
                onDragStart={(event) => {
                  event.dataTransfer.setData(LIBRARY_DRAG_MIME, JSON.stringify(exercise));
                  event.dataTransfer.effectAllowed = "copy";
                }}
              >
                <div className={styles.listRowInner}>
                  <ExerciseThumbnail source={thumbnail} size="sm" hideStatusBadge />
                  <h3 className={styles.listRowTitle}>{exercise.name}</h3>
                  <div className={styles.cardActions}>
                    <span
                      className={styles.dragHandle}
                      aria-label={`Drag ${exercise.name}`}
                      title={`Drag ${exercise.name}`}
                    >
                      ⠿
                    </span>
                    <button
                      type="button"
                      className={styles.addButton}
                      disabled={!selectedBlockId}
                      aria-label={`Add ${exercise.name}`}
                      onClick={() => {
                        onAddExercise(exercise);
                      }}
                    >
                      Add
                    </button>
                  </div>
                </div>
              </article>
            );
          }

          return (
            <article
              key={exercise.exerciseId}
              className={styles.card}
              draggable
              onDragStart={(event) => {
                event.dataTransfer.setData(LIBRARY_DRAG_MIME, JSON.stringify(exercise));
                event.dataTransfer.effectAllowed = "copy";
              }}
            >
              <div className={styles.cardHeader}>
                <h3 className={styles.cardTitle}>{exercise.name}</h3>
                <div className={styles.cardActions}>
                  <span
                    className={styles.dragHandle}
                    aria-label={`Drag ${exercise.name}`}
                    title={`Drag ${exercise.name}`}
                  >
                    ⠿
                  </span>
                  <button
                    type="button"
                    className={styles.addButton}
                    disabled={!selectedBlockId}
                    aria-label={`Add ${exercise.name}`}
                    onClick={() => {
                      onAddExercise(exercise);
                    }}
                  >
                    Add
                  </button>
                </div>
              </div>
              <div className={styles.cardImageWrap}>
                <ExerciseThumbnail source={thumbnail} size="libraryCard" hideStatusBadge />
              </div>
            </article>
          );
        })}
        {filtered.length === 0 ? (
          <p className={styles.empty}>No exercises match this filter.</p>
        ) : null}
        {filtered.length > 80 ? (
          <p className={styles.more}>Showing first 80 of {filtered.length} matches.</p>
        ) : null}
        </div>
      </div>

      <button type="button" className={styles.customButton} onClick={onAddCustomExercise}>
        + Add custom exercise
      </button>
    </aside>
  );
}
