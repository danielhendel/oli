"use client";

import { useMemo, useState } from "react";

import { ExerciseThumbnail } from "@/components/workout-studio/ExerciseThumbnail";
import { hasExerciseAcademyIntelligence, getExerciseAcademyIntelligenceById } from "@/features/exercise-academy/exerciseAcademyIntelligenceRegistry";
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

export function WorkoutLibraryPanel({
  selectedBlockId,
  onAddExercise,
  onAddCustomExercise,
}: WorkoutLibraryPanelProps) {
  const [filter, setFilter] = useState<WorkoutLibraryFilter>("all");
  const [search, setSearch] = useState("");
  const [expandedIntelId, setExpandedIntelId] = useState<string | null>(null);

  const catalog = useMemo(() => listCanonicalWorkoutLibraryExercises(), []);
  const filtered = useMemo(
    () => filterWorkoutLibraryExercises(catalog, filter, search),
    [catalog, filter, search],
  );

  return (
    <aside id="studio-exercise-library" className={styles.panel}>
      <header className={styles.header}>
        <div className={styles.eyebrow}>Workout Library</div>
        <h2 className={styles.title}>Exercise palette</h2>
        <p className={styles.subtitle}>Drag or add exercises into the selected block</p>
        {selectedBlockId ? (
          <p className={styles.selectedHint}>Adding to selected block</p>
        ) : (
          <p className={styles.hint}>Select a block to add exercises.</p>
        )}
      </header>

      <input
        className={styles.search}
        value={search}
        onChange={(event) => {
          setSearch(event.target.value);
        }}
        placeholder="Search exercises, muscles, equipment…"
        aria-label="Search workout library"
      />

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

      <div className={styles.list}>
        {filtered.slice(0, 80).map((exercise) => {
          const hasIntel = hasExerciseAcademyIntelligence(exercise.exerciseId);
          const intelligence = hasIntel
            ? getExerciseAcademyIntelligenceById(exercise.exerciseId)
            : null;
          const isExpanded = expandedIntelId === exercise.exerciseId;
          const thumbnail = resolveExerciseThumbnail({
            exerciseId: exercise.exerciseId,
            exerciseName: exercise.name,
            primaryMuscle: exercise.primaryMuscles[0],
            equipment: exercise.equipment,
          });

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
              <div className={styles.cardTop}>
                <div className={styles.cardMain}>
                  <ExerciseThumbnail source={thumbnail} size="sm" />
                  <div className={styles.cardContent}>
                    <div className={styles.cardTitleRow}>
                      <h3 className={styles.cardTitle}>{exercise.name}</h3>
                      {hasIntel ? <span className={styles.intelBadge}>Academy</span> : null}
                    </div>
                    <p className={styles.cardMeta}>
                      {exercise.primaryMuscles.join(" · ")} · {exercise.equipment}
                    </p>
                    {intelligence ? (
                      <p className={styles.intelSummary}>
                        Primary: {intelligence.primaryMuscles.join(", ")}
                        {intelligence.secondaryMuscles.length > 0
                          ? ` · Secondary: ${intelligence.secondaryMuscles.join(", ")}`
                          : ""}
                      </p>
                    ) : null}
                  </div>
                </div>
                <div className={styles.cardActions}>
                  <span className={styles.dragHandle} aria-hidden="true">
                    ⠿
                  </span>
                  <button
                    type="button"
                    className={styles.addButton}
                    disabled={!selectedBlockId}
                    onClick={() => {
                      onAddExercise(exercise);
                    }}
                  >
                    Add
                  </button>
                </div>
              </div>
              <div className={styles.tags}>
                <span className={styles.tag}>{exercise.movementPattern}</span>
                <span className={styles.tagMono}>{exercise.exerciseId}</span>
                {intelligence ? (
                  <button
                    type="button"
                    className={styles.whyButton}
                    aria-expanded={isExpanded}
                    onClick={() => {
                      setExpandedIntelId(isExpanded ? null : exercise.exerciseId);
                    }}
                  >
                    Why use it?
                  </button>
                ) : null}
              </div>
              {isExpanded && intelligence ? (
                <div className={styles.intelDetail}>
                  <p>{intelligence.coachingDecisionNotes}</p>
                  <p className={styles.intelDetailMeta}>
                    Best for:{" "}
                    {intelligence.programmingUseCases
                      .filter((item) => item.fit === "primary")
                      .map((item) => item.goal)
                      .join(", ") || "general programming"}
                  </p>
                  <p className={styles.intelDetailMeta}>
                    Joints:{" "}
                    {intelligence.jointConsiderations
                      .map((item) => `${item.joint} (${item.stressLevel})`)
                      .join(" · ")}
                  </p>
                  <p className={styles.intelDetailMeta}>
                    Swap: {intelligence.substitutions.substitutionOptions[0] ?? "—"}
                  </p>
                </div>
              ) : null}
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

      <button type="button" className={styles.customButton} onClick={onAddCustomExercise}>
        + Add custom exercise
      </button>
    </aside>
  );
}
