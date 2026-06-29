"use client";

import type { WorkoutExperiencePreview } from "@/features/workout-studio/types";
import styles from "./ClientExperiencePreviewPanel.module.css";

type ClientExperiencePreviewPanelProps = {
  open: boolean;
  preview: WorkoutExperiencePreview;
  onClose: () => void;
};

export function ClientExperiencePreviewPanel({
  open,
  preview,
  onClose,
}: ClientExperiencePreviewPanelProps) {
  if (!open) return null;

  return (
    <div className={styles.backdrop} role="presentation" onClick={onClose}>
      <aside
        className={styles.panel}
        role="dialog"
        aria-label="Client experience preview"
        onClick={(event) => {
          event.stopPropagation();
        }}
      >
        <header className={styles.header}>
          <div>
            <div className={styles.eyebrow}>Client Preview</div>
            <h2 className={styles.title}>{preview.title || "Untitled workout"}</h2>
            <p className={styles.subtitle}>
              {preview.objective || "No objective yet"} · {preview.estimatedDurationMinutes ?? "—"}{" "}
              min · {preview.difficulty}
            </p>
          </div>
          <button type="button" className={styles.closeButton} onClick={onClose}>
            Close
          </button>
        </header>

        <div className={styles.body}>
          {preview.desiredAdaptation ? (
            <section className={styles.section}>
              <h3>Desired adaptation</h3>
              <p>{preview.desiredAdaptation}</p>
            </section>
          ) : null}

          {preview.blocks.length === 0 ? (
            <p className={styles.empty}>No blocks designed yet.</p>
          ) : (
            preview.blocks.map((block) => (
              <section key={block.id} className={styles.blockSection}>
                <h3 className={styles.blockTitle}>{block.title}</h3>
                {block.notes ? <p className={styles.blockNotes}>{block.notes}</p> : null}
                {block.exercises.map((exercise) => (
                  <article key={exercise.id} className={styles.exerciseCard}>
                    <h4>{exercise.name}</h4>
                    {exercise.designedSets.length > 0 ? (
                      <div className={styles.setsRow}>
                        {exercise.designedSets.map((set) => (
                          <span key={set.setId} className={styles.setPill}>
                            Set {set.setNumber}: {set.repRange}
                            {set.rpeTarget != null ? ` · RPE ${set.rpeTarget}` : ""}
                          </span>
                        ))}
                      </div>
                    ) : null}
                    {exercise.why ? (
                      <div className={styles.field}>
                        <span className={styles.fieldLabel}>Why</span>
                        <p>{exercise.why}</p>
                      </div>
                    ) : null}
                    {exercise.whyToday ? (
                      <div className={styles.field}>
                        <span className={styles.fieldLabel}>Why today</span>
                        <p>{exercise.whyToday}</p>
                      </div>
                    ) : null}
                    {exercise.how ? (
                      <div className={styles.field}>
                        <span className={styles.fieldLabel}>How</span>
                        <p>{exercise.how}</p>
                      </div>
                    ) : null}
                    {exercise.cues.length > 0 ? (
                      <div className={styles.field}>
                        <span className={styles.fieldLabel}>Cues</span>
                        <ul>
                          {exercise.cues.map((cue) => (
                            <li key={cue}>{cue}</li>
                          ))}
                        </ul>
                      </div>
                    ) : null}
                    {exercise.shouldFeel.length > 0 ? (
                      <div className={styles.field}>
                        <span className={styles.fieldLabel}>Should feel</span>
                        <p>{exercise.shouldFeel.join(" · ")}</p>
                      </div>
                    ) : null}
                    {exercise.progressionRules.length > 0 ? (
                      <div className={styles.field}>
                        <span className={styles.fieldLabel}>Progression</span>
                        <ul>
                          {exercise.progressionRules.map((rule) => (
                            <li key={rule}>{rule}</li>
                          ))}
                        </ul>
                      </div>
                    ) : null}
                  </article>
                ))}
              </section>
            ))
          )}
        </div>
      </aside>
    </div>
  );
}
