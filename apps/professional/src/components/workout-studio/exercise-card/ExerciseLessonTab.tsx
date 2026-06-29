"use client";

import { useMemo } from "react";

import { getExerciseAcademyEntryById } from "@/features/exercise-academy/exerciseAcademyAdapter";
import { buildExerciseLessonModules } from "@/features/exercise-academy/buildExerciseLessonModules";
import { linesFromItems, linesToItems } from "@/features/workout-studio/exerciseCardUtils";
import { listCanonicalWorkoutLibraryExercises } from "@/features/workout-studio/exerciseLibraryAdapter";
import type { WorkoutExerciseCard } from "@/features/workout-studio/types";
import { DesignerIntelligencePanel } from "./DesignerIntelligencePanel";
import { LessonSectionCard } from "./LessonSectionCard";
import { TabPanelShell } from "./TabPanelShell";
import styles from "./exerciseCard.module.css";

type ExerciseLessonTabProps = {
  exercise: WorkoutExerciseCard;
  onUpdate: (patch: Partial<WorkoutExerciseCard>) => void;
};

export function ExerciseLessonTab({ exercise, onUpdate }: ExerciseLessonTabProps) {
  const libraryExercises = useMemo(() => listCanonicalWorkoutLibraryExercises(), []);
  const academyEntry = useMemo(() => {
    if (exercise.source !== "canonical" || !exercise.exerciseId) return null;
    return getExerciseAcademyEntryById(exercise.exerciseId, libraryExercises);
  }, [exercise.exerciseId, exercise.source, libraryExercises]);

  const lessonModules = useMemo(
    () => (academyEntry ? buildExerciseLessonModules(academyEntry) : []),
    [academyEntry],
  );

  const moduleByTitle = (title: string) => lessonModules.find((module) => module.title === title);

  const qualityScore = academyEntry?.quality.score;

  return (
    <TabPanelShell tab="lesson" icon="◈">
      {academyEntry ? (
        <div className={styles.academyBanner}>
          <div>
            <span className={styles.academyBannerLabel}>Exercise Academy</span>
            <strong>{academyEntry.version}</strong>
          </div>
          <div className={styles.academyBannerStats}>
            <span>Quality {qualityScore ?? 0}</span>
          </div>
        </div>
      ) : (
        <p className={styles.academyBannerMuted}>
          Custom exercise — lesson content is fully coach-authored for this card.
        </p>
      )}

      {exercise.source === "canonical" && exercise.exerciseId ? (
        <DesignerIntelligencePanel exerciseId={exercise.exerciseId} />
      ) : null}

      <div className={styles.cardGroup}>
        <h6 className={styles.groupTitle}>Lesson Sections</h6>
        <div className={styles.lessonGrid}>
          <LessonSectionCard
            title="Overview"
            summary={moduleByTitle("Overview")?.summary ?? "Why this exercise matters."}
            qualityLabel={qualityScore != null ? `Q${qualityScore}` : undefined}
            mediaStatus="planned"
            value={exercise.design.whyThisExercise}
            onChange={(value) => {
              onUpdate({ design: { ...exercise.design, whyThisExercise: value } });
            }}
          />
          <LessonSectionCard
            title="Setup"
            summary={moduleByTitle("Setup")?.summary ?? "Starting position and equipment."}
            qualityLabel={academyEntry?.quality.hasSetup ? "Complete" : "Draft"}
            mediaStatus="planned"
            value={exercise.design.setupInstructions}
            onChange={(value) => {
              onUpdate({ design: { ...exercise.design, setupInstructions: value } });
            }}
          />
          <LessonSectionCard
            title="Execution"
            summary={moduleByTitle("Execution")?.summary ?? "How to perform each rep."}
            qualityLabel={academyEntry?.quality.hasExecution ? "Complete" : "Draft"}
            mediaStatus="planned"
            value={exercise.design.executionInstructions}
            onChange={(value) => {
              onUpdate({ design: { ...exercise.design, executionInstructions: value } });
            }}
          />
          <LessonSectionCard
            title="Common Mistakes"
            summary={
              moduleByTitle("Common Mistakes")?.summary ?? "Patterns to watch for and correct."
            }
            qualityLabel={academyEntry?.quality.hasMistakes ? "Complete" : "Draft"}
            value={linesFromItems(exercise.design.commonMistakes)}
            onChange={(value) => {
              onUpdate({
                design: {
                  ...exercise.design,
                  commonMistakes: linesToItems(value, "mistake"),
                },
              });
            }}
          />
          <LessonSectionCard
            title="What You Should Feel"
            summary={moduleByTitle("What You Should Feel")?.summary ?? "Target sensations."}
            qualityLabel={academyEntry?.quality.hasFeelGuide ? "Complete" : "Draft"}
            value={[
              ...exercise.design.shouldFeel.map((item) => `Should feel: ${item.text}`),
              ...exercise.design.shouldNotFeel.map((item) => `Should not feel: ${item.text}`),
            ].join("\n")}
            onChange={(value) => {
              const feelLines: string[] = [];
              const notFeelLines: string[] = [];
              for (const line of value.split("\n")) {
                const trimmed = line.trim();
                if (!trimmed) continue;
                if (trimmed.toLowerCase().startsWith("should not feel:")) {
                  notFeelLines.push(trimmed.replace(/^should not feel:\s*/i, ""));
                } else if (trimmed.toLowerCase().startsWith("should feel:")) {
                  feelLines.push(trimmed.replace(/^should feel:\s*/i, ""));
                } else {
                  feelLines.push(trimmed);
                }
              }
              onUpdate({
                design: {
                  ...exercise.design,
                  shouldFeel: linesToItems(feelLines.join("\n"), "feel"),
                  shouldNotFeel: linesToItems(notFeelLines.join("\n"), "nofeel"),
                },
              });
            }}
          />
          <LessonSectionCard
            title="Reflection"
            summary={moduleByTitle("Reflection")?.summary ?? "Post-set check-in prompts."}
            value={exercise.design.educationNotes}
            onChange={(value) => {
              onUpdate({ design: { ...exercise.design, educationNotes: value } });
            }}
          />
        </div>
      </div>
    </TabPanelShell>
  );
}
