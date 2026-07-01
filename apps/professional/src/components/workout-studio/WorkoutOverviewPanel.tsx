"use client";

import { useState } from "react";

import { MOCK_CLIENTS } from "@/lib/mockClients";
import styles from "./WorkoutAuthorCanvas.module.css";

type WorkoutOverviewPanelProps = {
  workoutTitle: string;
  clientName: string;
  objective: string;
  desiredAdaptation: string;
  roleInHealthSystem: string;
  estimatedDurationMinutes: number | null;
  difficulty: string;
  onMetaChange: (patch: {
    title?: string;
    clientName?: string;
    objective?: string;
    desiredAdaptation?: string;
    roleInHealthSystem?: string;
    estimatedDurationMinutes?: number | null;
    difficulty?: "beginner" | "intermediate" | "advanced" | "elite";
  }) => void;
};

export function WorkoutOverviewPanel(props: WorkoutOverviewPanelProps) {
  const [advancedOpen, setAdvancedOpen] = useState(false);

  return (
    <section className={styles.overviewCard} id="studio-overview" data-testid="studio-overview-panel">
      <div className={styles.panelEyebrow}>Overview</div>
      <h2 className={styles.overviewTitle}>Define this workout</h2>
      <p className={styles.toolbarHint}>
        Name the session, set the goal, and choose who it is for. Build exercises in Blocks.
      </p>

      <div className={styles.fieldGrid}>
        <label className={styles.field}>
          <span>Workout name</span>
          <input
            value={props.workoutTitle}
            onChange={(event) => {
              props.onMetaChange({ title: event.target.value });
            }}
            aria-label="Workout name"
          />
        </label>
        <label className={styles.field}>
          <span>Target client</span>
          <select
            value={props.clientName}
            onChange={(event) => {
              props.onMetaChange({ clientName: event.target.value });
            }}
            aria-label="Target client"
          >
            {MOCK_CLIENTS.map((client) => (
              <option key={client.id} value={client.name}>
                {client.name}
              </option>
            ))}
          </select>
        </label>
        <label className={styles.field}>
          <span>Estimated duration (minutes)</span>
          <input
            type="number"
            value={props.estimatedDurationMinutes ?? ""}
            onChange={(event) => {
              const value = event.target.value;
              props.onMetaChange({
                estimatedDurationMinutes: value ? Number(value) : null,
              });
            }}
            aria-label="Estimated duration in minutes"
          />
        </label>
        <label className={styles.field}>
          <span>Difficulty</span>
          <select
            value={props.difficulty}
            onChange={(event) => {
              props.onMetaChange({
                difficulty: event.target.value as
                  | "beginner"
                  | "intermediate"
                  | "advanced"
                  | "elite",
              });
            }}
            aria-label="Workout difficulty"
          >
            <option value="beginner">Beginner</option>
            <option value="intermediate">Intermediate</option>
            <option value="advanced">Advanced</option>
            <option value="elite">Elite</option>
          </select>
        </label>
        <label className={`${styles.field} ${styles.full}`}>
          <span>Primary goal / objective</span>
          <textarea
            value={props.objective}
            onChange={(event) => {
              props.onMetaChange({ objective: event.target.value });
            }}
            aria-label="Workout objective"
            placeholder="What should this session accomplish?"
          />
        </label>
        <label className={`${styles.field} ${styles.full}`}>
          <span>Desired adaptation</span>
          <textarea
            value={props.desiredAdaptation}
            onChange={(event) => {
              props.onMetaChange({ desiredAdaptation: event.target.value });
            }}
            aria-label="Desired adaptation"
            placeholder="Optional — hypertrophy, strength, recovery, etc."
          />
        </label>
      </div>

      <button
        type="button"
        className={styles.overviewToggle}
        onClick={() => {
          setAdvancedOpen((value) => !value);
        }}
        style={{ marginTop: 12 }}
      >
        <span className={styles.panelEyebrow}>Advanced context</span>
        <span className={styles.chevron}>{advancedOpen ? "−" : "+"}</span>
      </button>

      {advancedOpen ? (
        <label className={`${styles.field} ${styles.full}`} style={{ marginTop: 12 }}>
          <span>Role in health system</span>
          <textarea
            value={props.roleInHealthSystem}
            onChange={(event) => {
              props.onMetaChange({ roleInHealthSystem: event.target.value });
            }}
            aria-label="Role in health system"
          />
        </label>
      ) : null}
    </section>
  );
}
