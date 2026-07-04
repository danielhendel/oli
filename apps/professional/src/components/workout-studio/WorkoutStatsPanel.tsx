"use client";

import { useMemo } from "react";

import { ProjectedVolumeCard } from "@/components/workout-studio/ProjectedVolumeCard";
import { WorkoutQualityCard } from "@/components/workout-studio/WorkoutQualityCard";
import { countFlaggedJoints } from "@/features/workout-studio/buildVolumeAttributionDetail";
import type { WorkoutQualityChecklist } from "@/features/workout-studio/buildWorkoutQualityChecklist";
import type { WorkoutVolumeAttribution } from "@/features/workout-studio/buildWorkoutVolumeAttribution";
import styles from "./WorkoutAuthorCanvas.module.css";

type WorkoutStatsPanelProps = {
  attribution: WorkoutVolumeAttribution;
  qualityChecklist: WorkoutQualityChecklist;
  onGoToBlocks?: () => void;
  onGoToOverview?: () => void;
};

export function WorkoutStatsPanel({
  attribution,
  qualityChecklist,
  onGoToBlocks,
  onGoToOverview,
}: WorkoutStatsPanelProps) {
  const flaggedJoints = useMemo(() => countFlaggedJoints(attribution), [attribution]);

  const incompleteItems = qualityChecklist.items.filter((item) => !item.complete);
  const blockingIssues = incompleteItems.filter((item) =>
    ["hasBlocks", "hasExercises", "hasDesignedSets", "purposeComplete"].includes(item.id),
  );

  return (
    <section className={styles.canvasColumn} data-testid="studio-stats-panel">
      <div className={styles.blocksHeading}>
        <div className={styles.panelEyebrow}>Workout Stats</div>
        <h2 className={styles.panelTitle}>Volume, balance, and readiness</h2>
        <p className={styles.toolbarHint}>
          Inspect projected load and quality signals. Edit exercises in Workout.
        </p>
      </div>

      {(blockingIssues.length > 0 || flaggedJoints > 0 || attribution.totalExercisesMissingIntelligence > 0) ? (
        <div className={styles.emptyState} style={{ textAlign: "left", marginBottom: 8 }}>
          <div className={styles.emptyTitle} style={{ fontSize: 18 }}>
            {blockingIssues.length + (flaggedJoints > 0 ? 1 : 0)} issue
            {blockingIssues.length + (flaggedJoints > 0 ? 1 : 0) === 1 ? "" : "s"} to review
          </div>
          <ul style={{ margin: "8px 0 0", paddingLeft: 18, color: "#9aa3b2", lineHeight: 1.6 }}>
            {blockingIssues.map((item) => (
              <li key={item.id}>
                {item.detail}
                {item.id === "purposeComplete" && onGoToOverview ? (
                  <>
                    {" "}
                    <button
                      type="button"
                      className={styles.toolbarHint}
                      style={{ color: "#9eb4ff", background: "none", border: "none", padding: 0, cursor: "pointer" }}
                      onClick={onGoToOverview}
                    >
                      Go to Overview
                    </button>
                  </>
                ) : null}
                {["hasBlocks", "hasExercises", "hasDesignedSets"].includes(item.id) && onGoToBlocks ? (
                  <>
                    {" "}
                    <button
                      type="button"
                      className={styles.toolbarHint}
                      style={{ color: "#9eb4ff", background: "none", border: "none", padding: 0, cursor: "pointer" }}
                      onClick={onGoToBlocks}
                    >
                      Go to Workout
                    </button>
                  </>
                ) : null}
              </li>
            ))}
            {flaggedJoints > 0 ? (
              <li>{flaggedJoints} joint stress flag(s) — review below</li>
            ) : null}
            {attribution.totalExercisesMissingIntelligence > 0 ? (
              <li>
                {attribution.totalExercisesMissingIntelligence} exercise(s) missing academy intelligence
              </li>
            ) : null}
          </ul>
        </div>
      ) : null}

      <ProjectedVolumeCard attribution={attribution} />
      <WorkoutQualityCard checklist={qualityChecklist} />
    </section>
  );
}
