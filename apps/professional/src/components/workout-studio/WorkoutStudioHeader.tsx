"use client";

import styles from "./WorkoutStudioHeader.module.css";

export function WorkoutStudioHeader() {
  return (
    <header className={styles.header} data-testid="workout-studio-header">
      <h1 className={styles.srOnly}>Workout Design Studio</h1>
    </header>
  );
}
