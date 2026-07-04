"use client";

import styles from "./WorkoutStudioActions.module.css";

type WorkoutStudioActionsProps = {
  onPreview: () => void;
  onSave: () => void;
};

export function WorkoutStudioActions({ onPreview, onSave }: WorkoutStudioActionsProps) {
  return (
    <div className={styles.actions} data-testid="workout-studio-actions">
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
  );
}
