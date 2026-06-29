"use client";

import { LOGGING_FIELD_LABELS } from "@/features/workout-studio/types";
import type { WorkoutExerciseCard } from "@/features/workout-studio/types";
import { TabPanelShell } from "./TabPanelShell";
import styles from "./exerciseCard.module.css";

type ExerciseTrackingTabProps = {
  exercise: WorkoutExerciseCard;
  onUpdate: (patch: Partial<WorkoutExerciseCard>) => void;
};

export function ExerciseTrackingTab({ exercise, onUpdate }: ExerciseTrackingTabProps) {
  return (
    <TabPanelShell tab="tracking" icon="▤">
      <div className={styles.cardGroup}>
        <p className={styles.groupHint}>
          Enable the fields your client will log during execution. Aligns with journal{" "}
          <code>strength_set_logged</code>.
        </p>
        <div className={styles.trackingGrid}>
          {exercise.logging.fields.map((field, index) => (
            <label
              key={field.kind}
              className={`${styles.trackingCard} ${field.enabled ? styles.trackingCardActive : ""}`}
            >
              <input
                type="checkbox"
                checked={field.enabled}
                onChange={(event) => {
                  const next = [...exercise.logging.fields];
                  const current = next[index];
                  if (!current) return;
                  next[index] = { ...current, enabled: event.target.checked };
                  onUpdate({ logging: { fields: next } });
                }}
              />
              <span className={styles.trackingCardLabel}>{LOGGING_FIELD_LABELS[field.kind]}</span>
              <span className={styles.trackingCardHint}>
                {field.enabled ? "Enabled" : "Disabled"}
              </span>
            </label>
          ))}
        </div>
      </div>

      <div className={styles.cardGroup}>
        <article className={styles.placeholderCardInline}>
          <h6>Session Analytics</h6>
          <p>Future charts for load trends, RPE drift, and technique quality over time.</p>
          <span className={styles.placeholderBadge}>Coming soon</span>
        </article>
      </div>
    </TabPanelShell>
  );
}
