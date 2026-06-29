"use client";

import { getExerciseAcademyIntelligenceById } from "@/features/exercise-academy/exerciseAcademyIntelligenceRegistry";
import type { ExerciseAcademyIntelligenceEntry } from "@/features/exercise-academy/exerciseAcademyIntelligenceTypes";
import styles from "./exerciseCard.module.css";

type DesignerIntelligencePanelProps = {
  exerciseId: string | null;
};

function formatGoalLabel(goal: ExerciseAcademyIntelligenceEntry["programmingUseCases"][number]["goal"]): string {
  return goal.replace(/-/g, " ");
}

function primaryUseCases(entry: ExerciseAcademyIntelligenceEntry): string {
  const primary = entry.programmingUseCases.filter((item) => item.fit === "primary");
  if (primary.length === 0) return entry.coachingDecisionNotes;
  return primary.map((item) => `${formatGoalLabel(item.goal)}: ${item.note}`).join(" · ");
}

export function DesignerIntelligencePanel({ exerciseId }: DesignerIntelligencePanelProps) {
  if (!exerciseId) return null;

  const intelligence = getExerciseAcademyIntelligenceById(exerciseId);
  if (!intelligence) return null;

  return (
    <section className={styles.designerIntelPanel} aria-label="Designer Intelligence">
      <header className={styles.designerIntelHeader}>
        <div>
          <span className={styles.designerIntelEyebrow}>Designer Intelligence</span>
          <strong className={styles.designerIntelTitle}>Academy baseline</strong>
        </div>
        <span className={styles.designerIntelBadge}>{intelligence.reviewStatus}</span>
      </header>
      <p className={styles.designerIntelDisclaimer}>
        Academy baseline — customize with your coaching style. Joint considerations are coaching
        guidance, not medical diagnosis.
      </p>

      <div className={styles.designerIntelGrid}>
        <div className={styles.designerIntelBlock}>
          <span className={styles.designerIntelLabel}>Primary muscles</span>
          <p>{intelligence.primaryMuscles.join(" · ") || "—"}</p>
        </div>
        <div className={styles.designerIntelBlock}>
          <span className={styles.designerIntelLabel}>Secondary muscles</span>
          <p>{intelligence.secondaryMuscles.join(" · ") || "—"}</p>
        </div>
        <div className={styles.designerIntelBlock}>
          <span className={styles.designerIntelLabel}>Stabilizers</span>
          <p>{intelligence.stabilizers.join(" · ") || "—"}</p>
        </div>
        <div className={styles.designerIntelBlock}>
          <span className={styles.designerIntelLabel}>Joint considerations</span>
          <ul className={styles.designerIntelList}>
            {intelligence.jointConsiderations.map((item) => (
              <li key={`${item.joint}-${item.stressLevel}`}>
                {item.joint} ({item.stressLevel}) — {item.note}
              </li>
            ))}
          </ul>
        </div>
        <div className={styles.designerIntelBlock}>
          <span className={styles.designerIntelLabel}>Best used for</span>
          <p>{primaryUseCases(intelligence)}</p>
        </div>
        <div className={styles.designerIntelBlock}>
          <span className={styles.designerIntelLabel}>Fatigue profile</span>
          <p>
            Local {intelligence.fatigueProfile.localFatigue} · Systemic{" "}
            {intelligence.fatigueProfile.systemicFatigue} · Recovery{" "}
            {intelligence.fatigueProfile.recoveryCost}
          </p>
          <p className={styles.designerIntelMuted}>{intelligence.fatigueProfile.note}</p>
        </div>
        <div className={styles.designerIntelBlock}>
          <span className={styles.designerIntelLabel}>Coaching decision notes</span>
          <p>{intelligence.coachingDecisionNotes}</p>
        </div>
        <div className={styles.designerIntelBlock}>
          <span className={styles.designerIntelLabel}>Substitutions</span>
          <p>
            Regressions: {intelligence.substitutions.regressionOptions.join(", ") || "—"}
          </p>
          <p>
            Swaps: {intelligence.substitutions.substitutionOptions.join(", ") || "—"}
          </p>
        </div>
      </div>
    </section>
  );
}
