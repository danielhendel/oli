"use client";

import { linesFromItems, linesToItems, parseLines } from "@/features/workout-studio/exerciseCardUtils";
import type { WorkoutExerciseCard } from "@/features/workout-studio/types";
import { TabPanelShell } from "./TabPanelShell";
import styles from "./exerciseCard.module.css";

type ExerciseProgressionTabProps = {
  exercise: WorkoutExerciseCard;
  onUpdate: (patch: Partial<WorkoutExerciseCard>) => void;
};

function ProgressionCard({
  title,
  hint,
  value,
  onChange,
}: {
  title: string;
  hint: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <article className={styles.fieldCard}>
      <header className={styles.fieldCardHeader}>
        <h6>{title}</h6>
        <p>{hint}</p>
      </header>
      <textarea
        rows={4}
        value={value}
        onChange={(event) => {
          onChange(event.target.value);
        }}
      />
    </article>
  );
}

export function ExerciseProgressionTab({ exercise, onUpdate }: ExerciseProgressionTabProps) {
  return (
    <TabPanelShell tab="progression" icon="↗">
      <div className={styles.cardGroup}>
        <div className={styles.coachingGrid}>
          <ProgressionCard
            title="Progression Rules"
            hint="When and how to advance load, reps, or complexity."
            value={linesFromItems(exercise.progressionRules)}
            onChange={(value) => {
              onUpdate({ progressionRules: linesToItems(value, "prog") });
            }}
          />
          <ProgressionCard
            title="Regression Rules"
            hint="When to scale back — options and triggers (one per line)."
            value={exercise.regressionOptions.join("\n")}
            onChange={(value) => {
              onUpdate({ regressionOptions: parseLines(value) });
            }}
          />
          <ProgressionCard
            title="Exercise Swaps"
            hint="Substitution options that preserve training intent."
            value={exercise.substitutionOptions.join("\n")}
            onChange={(value) => {
              onUpdate({ substitutionOptions: parseLines(value) });
            }}
          />
          <ProgressionCard
            title="Failure Rules"
            hint="How close to failure is allowed for this prescription."
            value={exercise.prescription.failurePolicy}
            onChange={(value) => {
              onUpdate({
                prescription: { ...exercise.prescription, failurePolicy: value },
              });
            }}
          />
        </div>
      </div>

      <div className={styles.cardGroup}>
        <h6 className={styles.groupTitle}>Guardrails</h6>
        <div className={styles.placeholderGrid}>
          <article className={styles.placeholderCard}>
            <h6>Pain Rules</h6>
            <p>Define pain thresholds and stop criteria for this client.</p>
            <span className={styles.placeholderBadge}>Coming soon</span>
          </article>
          <article className={styles.placeholderCard}>
            <h6>Deload Rules</h6>
            <p>Automatic deload triggers based on performance or recovery.</p>
            <span className={styles.placeholderBadge}>Coming soon</span>
          </article>
          <article className={styles.placeholderCard}>
            <h6>Automatic Notes</h6>
            <p>System-generated progression notes after each session.</p>
            <span className={styles.placeholderBadge}>Coming soon</span>
          </article>
          <article className={styles.placeholderCard}>
            <h6>AI Suggestions</h6>
            <p>Adaptive progression recommendations from session history.</p>
            <span className={styles.placeholderBadge}>Coming soon</span>
          </article>
        </div>
      </div>
    </TabPanelShell>
  );
}
