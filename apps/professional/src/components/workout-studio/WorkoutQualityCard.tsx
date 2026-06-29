"use client";

import type { WorkoutQualityChecklist } from "@/features/workout-studio/buildWorkoutQualityChecklist";
import styles from "./WorkoutQualityCard.module.css";

type WorkoutQualityCardProps = {
  checklist: WorkoutQualityChecklist;
};

export function WorkoutQualityCard({ checklist }: WorkoutQualityCardProps) {
  return (
    <section className={styles.card} aria-label="Workout Quality">
      <header className={styles.header}>
        <div className={styles.eyebrow}>Workout Quality</div>
        <div className={styles.scoreRow}>
          <span className={styles.score}>{checklist.scorePercent}%</span>
          <span className={styles.scoreMeta}>
            {checklist.completedCount}/{checklist.totalCount} ready
          </span>
        </div>
      </header>
      <ul className={styles.list}>
        {checklist.items.map((item) => (
          <li key={item.id} className={styles.item}>
            <span
              className={`${styles.indicator} ${item.complete ? styles.indicatorComplete : ""}`}
              aria-hidden
            />
            <div>
              <div className={styles.itemLabel}>{item.label}</div>
              <div className={styles.itemDetail}>{item.detail}</div>
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}
