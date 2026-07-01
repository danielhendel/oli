"use client";

import {
  WORKOUT_STUDIO_MODES,
  type WorkoutStudioMode,
} from "@/features/workout-studio/workoutStudioNavigation";
import styles from "./WorkoutBuilderNavigator.module.css";

type WorkoutBuilderNavigatorProps = {
  activeMode: WorkoutStudioMode;
  onModeChange: (mode: WorkoutStudioMode) => void;
  qualityScore: number;
  totalSets: number;
  blockCount: number;
  exerciseCount: number;
};

function modeSubtitle(mode: WorkoutStudioMode, props: WorkoutBuilderNavigatorProps): string {
  if (mode === "overview") return "Name and define";
  if (mode === "stats") return `${props.totalSets} sets projected`;
  return `${props.blockCount} blocks · ${props.exerciseCount} exercises`;
}

export function WorkoutBuilderNavigator(props: WorkoutBuilderNavigatorProps) {
  return (
    <nav className={styles.navigator} aria-label="Workout studio modes">
      <div className={styles.signals}>
        <div className={styles.signal}>
          <span className={styles.signalLabel}>Quality</span>
          <strong>{props.qualityScore}%</strong>
        </div>
        <div className={styles.signal}>
          <span className={styles.signalLabel}>Sets</span>
          <strong>{props.totalSets}</strong>
        </div>
        <div className={styles.signal}>
          <span className={styles.signalLabel}>Blocks</span>
          <strong>{props.blockCount}</strong>
        </div>
        <div className={styles.signal}>
          <span className={styles.signalLabel}>Exercises</span>
          <strong>{props.exerciseCount}</strong>
        </div>
      </div>

      <ul className={styles.navList}>
        {WORKOUT_STUDIO_MODES.map((mode) => (
          <li key={mode.id}>
            <button
              type="button"
              className={`${styles.navItem} ${
                props.activeMode === mode.id ? styles.navItemActive : ""
              }`}
              aria-current={props.activeMode === mode.id ? "page" : undefined}
              onClick={() => {
                props.onModeChange(mode.id);
              }}
            >
              <span className={styles.navDot} aria-hidden="true" />
              <span className={styles.navText}>
                <span className={styles.navLabel}>{mode.label}</span>
                <span className={styles.navSubtitle}>{modeSubtitle(mode.id, props)}</span>
              </span>
            </button>
          </li>
        ))}
      </ul>
    </nav>
  );
}
