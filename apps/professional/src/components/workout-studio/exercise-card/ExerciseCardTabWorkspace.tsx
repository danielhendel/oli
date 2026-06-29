"use client";

import type { WorkoutExerciseCard } from "@/features/workout-studio/types";

import { ExerciseCoachingTab } from "./ExerciseCoachingTab";
import { ExerciseLessonTab } from "./ExerciseLessonTab";
import { ExerciseMediaTab } from "./ExerciseMediaTab";
import { ExerciseProgressionTab } from "./ExerciseProgressionTab";
import { ExerciseSetsTab } from "./ExerciseSetsTab";
import { ExerciseTrackingTab } from "./ExerciseTrackingTab";
import type { ExerciseCardTab } from "./types";
import cardStyles from "./exerciseCard.module.css";

type ExerciseCardTabWorkspaceProps = {
  exercise: WorkoutExerciseCard;
  activeTab: ExerciseCardTab;
  onUpdate: (patch: Partial<WorkoutExerciseCard>) => void;
  layout?: "canvas" | "studio";
  onOpenLessonPlayback?: () => void;
  lessonPlaybackAvailable?: boolean;
};

export function ExerciseCardTabWorkspace({
  exercise,
  activeTab,
  onUpdate,
  layout = "canvas",
  onOpenLessonPlayback,
  lessonPlaybackAvailable = false,
}: ExerciseCardTabWorkspaceProps) {
  const contentClass =
    layout === "studio" ? cardStyles.studioTabContent : cardStyles.tabContent;

  return (
    <div className={contentClass} key={activeTab}>
      {activeTab === "sets" ? <ExerciseSetsTab exercise={exercise} onUpdate={onUpdate} /> : null}
      {activeTab === "media" ? (
        <ExerciseMediaTab
          exercise={exercise}
          onUpdate={onUpdate}
          onOpenLessonPlayback={onOpenLessonPlayback}
          lessonPlaybackAvailable={lessonPlaybackAvailable}
        />
      ) : null}
      {activeTab === "lesson" ? <ExerciseLessonTab exercise={exercise} onUpdate={onUpdate} /> : null}
      {activeTab === "coaching" ? (
        <ExerciseCoachingTab exercise={exercise} onUpdate={onUpdate} />
      ) : null}
      {activeTab === "progression" ? (
        <ExerciseProgressionTab exercise={exercise} onUpdate={onUpdate} />
      ) : null}
      {activeTab === "tracking" ? (
        <ExerciseTrackingTab exercise={exercise} onUpdate={onUpdate} />
      ) : null}
    </div>
  );
}
