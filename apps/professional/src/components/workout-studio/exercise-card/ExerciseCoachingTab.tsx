"use client";

import { linesFromItems, linesToItems } from "@/features/workout-studio/exerciseCardUtils";
import type { WorkoutExerciseCard } from "@/features/workout-studio/types";
import { MediaPlaceholderCard } from "./MediaPlaceholderCard";
import { TabPanelShell } from "./TabPanelShell";
import styles from "./exerciseCard.module.css";

type ExerciseCoachingTabProps = {
  exercise: WorkoutExerciseCard;
  onUpdate: (patch: Partial<WorkoutExerciseCard>) => void;
};

function FieldCard({
  title,
  hint,
  value,
  rows = 4,
  onChange,
}: {
  title: string;
  hint: string;
  value: string;
  rows?: number;
  onChange: (value: string) => void;
}) {
  return (
    <article className={styles.fieldCard}>
      <header className={styles.fieldCardHeader}>
        <h6>{title}</h6>
        <p>{hint}</p>
      </header>
      <textarea
        rows={rows}
        value={value}
        onChange={(event) => {
          onChange(event.target.value);
        }}
      />
    </article>
  );
}

export function ExerciseCoachingTab({ exercise, onUpdate }: ExerciseCoachingTabProps) {
  return (
    <TabPanelShell tab="coaching" icon="✦">
      <div className={styles.cardGroup}>
        <div className={styles.coachingGrid}>
          <FieldCard
            title="Today's Focus"
            hint="Why this exercise today — session context for the client."
            value={exercise.design.whyToday}
            onChange={(value) => {
              onUpdate({ design: { ...exercise.design, whyToday: value } });
            }}
          />
          <FieldCard
            title="Coach Notes"
            hint="Your coaching intent and priorities for this exposure."
            value={exercise.design.coachingIntent}
            onChange={(value) => {
              onUpdate({ design: { ...exercise.design, coachingIntent: value } });
            }}
          />
          <FieldCard
            title="Client-Specific Adjustments"
            hint="Load, range, tempo, or setup tweaks for this client today."
            value={exercise.design.mediaNotes}
            onChange={(value) => {
              onUpdate({ design: { ...exercise.design, mediaNotes: value } });
            }}
          />
          <FieldCard
            title="Mental Cues"
            hint="Short cues the client should repeat (one per line)."
            value={linesFromItems(exercise.design.coachingCues)}
            rows={5}
            onChange={(value) => {
              onUpdate({
                design: {
                  ...exercise.design,
                  coachingCues: linesToItems(value, "cue"),
                },
              });
            }}
          />
          <FieldCard
            title="Special Instructions"
            hint="Load, tempo, or global guidance that applies across all sets."
            value={exercise.prescription.loadGuidance}
            onChange={(value) => {
              onUpdate({
                prescription: { ...exercise.prescription, loadGuidance: value },
              });
            }}
          />
        </div>
      </div>

      <div className={styles.cardGroup}>
        <article className={styles.placeholderCardInline}>
          <h6>Motivation</h6>
          <p>Use Today&apos;s Focus and Coach Notes for mindset framing until dedicated motivation fields ship.</p>
        </article>
      </div>

      <div className={styles.cardGroup}>
        <h6 className={styles.groupTitle}>Coach Media</h6>
        <div className={styles.mediaGridCompact}>
          <MediaPlaceholderCard title="Voice Note" status="planned" description="Record a personal cue for this client." />
          <MediaPlaceholderCard title="Coach Video" status="planned" description="Short custom video overlay for this session." />
        </div>
      </div>
    </TabPanelShell>
  );
}
