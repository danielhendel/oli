"use client";

import {
  WORKOUT_STUDIO_MODES,
  type WorkoutStudioMode,
} from "@/features/workout-studio/workoutStudioNavigation";
import styles from "./WorkoutBuilderTabs.module.css";

type WorkoutBuilderTabsProps = {
  activeMode: WorkoutStudioMode;
  onModeChange: (mode: WorkoutStudioMode) => void;
};

export function WorkoutBuilderTabs({ activeMode, onModeChange }: WorkoutBuilderTabsProps) {
  return (
    <div
      className={styles.tabList}
      data-testid="workout-builder-tabs"
      role="tablist"
      aria-label="Workout builder sections"
    >
      {WORKOUT_STUDIO_MODES.map((mode) => {
        const isActive = activeMode === mode.id;
        return (
          <button
            key={mode.id}
            type="button"
            role="tab"
            className={`${styles.tab} ${isActive ? styles.tabActive : ""}`}
            aria-selected={isActive}
            aria-controls={`studio-tabpanel-${mode.id}`}
            id={`studio-tab-${mode.id}`}
            onClick={() => {
              onModeChange(mode.id);
            }}
          >
            {mode.label}
          </button>
        );
      })}
    </div>
  );
}
