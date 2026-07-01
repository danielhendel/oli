"use client";

import styles from "./WorkoutStudioHeader.module.css";

type WorkoutStudioHeaderProps = {
  onPreview: () => void;
  onSave: () => void;
};

export function WorkoutStudioHeader({ onPreview, onSave }: WorkoutStudioHeaderProps) {
  return (
    <header className={styles.header} data-testid="workout-studio-header">
      <h1 className={styles.title}>Workout Design Studio</h1>

      <div className={styles.actions}>
        <button
          type="button"
          className={`${styles.actionButton} ${styles.actionButtonPrimary}`}
          onClick={onPreview}
          aria-label="Preview client experience"
        >
          Preview
        </button>
        <button
          type="button"
          className={`${styles.actionButton} ${styles.actionButtonStub}`}
          onClick={onSave}
          title="In-memory only — coach library save arrives in UX-5"
          aria-label="Save workout — in-memory only, coach library save arrives in UX-5"
        >
          Save
        </button>
        <button
          type="button"
          className={`${styles.actionButton} ${styles.actionButtonStub}`}
          title="Assignment flow arrives in UX-6"
          aria-label="Assign workout — assignment flow arrives in UX-6"
          disabled
        >
          Assign
        </button>
      </div>
    </header>
  );
}
