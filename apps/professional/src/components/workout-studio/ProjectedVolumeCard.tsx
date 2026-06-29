"use client";

import { useMemo, useState } from "react";

import { StudioModal } from "@/components/workout-studio/StudioModal";
import {
  buildJointStressDetail,
  buildPrimaryVolumeDetail,
  buildSecondaryVolumeDetail,
  buildStabilizerDetail,
  countFlaggedJoints,
  type VolumeAttributionDetail,
} from "@/features/workout-studio/buildVolumeAttributionDetail";
import type { WorkoutVolumeAttribution } from "@/features/workout-studio/buildWorkoutVolumeAttribution";
import type { JointKind, StressLevel } from "@/features/exercise-academy/exerciseAcademyIntelligenceTypes";
import styles from "./ProjectedVolumeCard.module.css";

type ProjectedVolumeCardProps = {
  attribution: WorkoutVolumeAttribution;
};

type ModalSelection =
  | { kind: "primary"; muscleGroup: string }
  | { kind: "secondary"; muscleGroup: string }
  | { kind: "stabilizer"; stabilizer: string }
  | { kind: "joint"; joint: JointKind; stressLevel: StressLevel };

function formatSetCount(count: number): string {
  return `${count} set${count === 1 ? "" : "s"}`;
}

function formatJointLabel(joint: JointKind, stressLevel: StressLevel): string {
  const label = joint.charAt(0).toUpperCase() + joint.slice(1);
  return `${label} · ${stressLevel}`;
}

export function ProjectedVolumeCard({ attribution }: ProjectedVolumeCardProps) {
  const [selection, setSelection] = useState<ModalSelection | null>(null);

  const flaggedJoints = useMemo(() => countFlaggedJoints(attribution), [attribution]);

  const detail: VolumeAttributionDetail | null = useMemo(() => {
    if (!selection) return null;
    if (selection.kind === "primary") {
      return buildPrimaryVolumeDetail(attribution, selection.muscleGroup);
    }
    if (selection.kind === "secondary") {
      return buildSecondaryVolumeDetail(attribution, selection.muscleGroup);
    }
    if (selection.kind === "stabilizer") {
      return buildStabilizerDetail(attribution, selection.stabilizer);
    }
    return buildJointStressDetail(attribution, selection.joint, selection.stressLevel);
  }, [attribution, selection]);

  const primaryMax = Math.max(1, ...attribution.primary.map((row) => row.sets));
  const secondaryMax = Math.max(1, ...attribution.secondary.map((row) => row.sets));

  const hasStabilizerJointRows =
    attribution.stabilizers.length > 0 || attribution.jointStress.length > 0;

  return (
    <>
      <section className={styles.card} aria-label="Projected Volume" id="studio-projected-volume">
        <header className={styles.header}>
          <div className={styles.headerRow}>
            <h2 className={styles.title}>Projected Volume</h2>
          </div>
        </header>

        <div className={styles.summaryGrid}>
          <div className={styles.summaryItem}>
            <span className={styles.summaryLabel}>Primary Sets</span>
            <strong className={styles.summaryValue}>{attribution.totalPrimarySets}</strong>
          </div>
          <div className={styles.summaryItem}>
            <span className={styles.summaryLabel}>Secondary Sets</span>
            <strong className={styles.summaryValue}>{attribution.totalSecondarySets}</strong>
          </div>
          <div className={styles.summaryItem}>
            <span className={styles.summaryLabel}>Joints Flagged</span>
            <strong className={styles.summaryValue}>{flaggedJoints}</strong>
          </div>
          <div className={styles.summaryItem}>
            <span className={styles.summaryLabel}>Missing Intel</span>
            <strong className={styles.summaryValue}>
              {attribution.totalExercisesMissingIntelligence}
            </strong>
          </div>
        </div>

        <div className={styles.columnsScroll}>
          <div className={styles.columnsGrid}>
            <section className={styles.column} aria-label="Primary projected volume">
              <header className={styles.columnHeader}>
                <h3 className={styles.columnTitle}>Primary</h3>
                <p className={styles.columnSubtitle}>Direct training volume</p>
              </header>
              <div className={styles.columnBody}>
                {attribution.primary.length === 0 ? (
                  <p className={styles.emptyColumn}>
                    Add strength exercises to see primary volume.
                  </p>
                ) : (
                  attribution.primary.map((row) => {
                    const progress = row.sets / primaryMax;
                    return (
                      <button
                        key={row.muscleGroup}
                        type="button"
                        className={styles.rowButton}
                        onClick={() => {
                          setSelection({ kind: "primary", muscleGroup: row.muscleGroup });
                        }}
                        aria-label={`Open ${row.muscleGroup} primary volume, ${formatSetCount(row.sets)}`}
                      >
                        <div className={styles.rowTop}>
                          <span className={styles.rowLabel}>{row.muscleGroup}</span>
                          <span className={styles.rowValueGroup}>
                            <span className={styles.rowValue}>{formatSetCount(row.sets)}</span>
                            <span className={styles.rowChevron} aria-hidden="true">
                              ›
                            </span>
                          </span>
                        </div>
                        <div className={styles.progressTrack} aria-hidden="true">
                          <div
                            className={styles.progressFill}
                            style={{ width: `${progress * 100}%` }}
                          />
                        </div>
                      </button>
                    );
                  })
                )}
              </div>
            </section>

            <section className={styles.column} aria-label="Secondary projected volume">
              <header className={styles.columnHeader}>
                <h3 className={styles.columnTitle}>Secondary</h3>
                <p className={styles.columnSubtitle}>Supporting contribution</p>
              </header>
              <div className={styles.columnBody}>
                {attribution.secondary.length === 0 ? (
                  <p className={styles.emptyColumn}>
                    Add Academy-backed exercises to see secondary contribution.
                  </p>
                ) : (
                  attribution.secondary.map((row) => {
                    const progress = row.sets / secondaryMax;
                    return (
                      <button
                        key={row.muscleGroup}
                        type="button"
                        className={styles.rowButton}
                        onClick={() => {
                          setSelection({ kind: "secondary", muscleGroup: row.muscleGroup });
                        }}
                        aria-label={`Open ${row.muscleGroup} secondary contribution, ${formatSetCount(row.sets)}`}
                      >
                        <div className={styles.rowTop}>
                          <span className={styles.rowLabel}>{row.muscleGroup}</span>
                          <span className={styles.rowValueGroup}>
                            <span className={styles.rowValue}>{formatSetCount(row.sets)}</span>
                            <span className={styles.rowChevron} aria-hidden="true">
                              ›
                            </span>
                          </span>
                        </div>
                        <div className={styles.progressTrack} aria-hidden="true">
                          <div
                            className={`${styles.progressFill} ${styles.progressFillSecondary}`}
                            style={{ width: `${progress * 100}%` }}
                          />
                        </div>
                      </button>
                    );
                  })
                )}
              </div>
            </section>

            <section className={styles.column} aria-label="Stabilizers and joint considerations">
              <header className={styles.columnHeader}>
                <h3 className={styles.columnTitle}>Stabilizers &amp; Joints</h3>
                <p className={styles.columnSubtitle}>Support demand and stress</p>
              </header>
              <div className={styles.columnBody}>
                {!hasStabilizerJointRows ? (
                  <p className={styles.emptyColumn}>
                    Add Academy-backed exercises to see support demand and joint considerations.
                  </p>
                ) : (
                  <>
                    {attribution.stabilizers.map((row) => (
                      <button
                        key={row.stabilizer}
                        type="button"
                        className={styles.insightRow}
                        onClick={() => {
                          setSelection({ kind: "stabilizer", stabilizer: row.stabilizer });
                        }}
                        aria-label={`Open ${row.stabilizer} stabilizer demand details`}
                      >
                        <div className={styles.insightRowMain}>
                          <span className={styles.insightLabel}>Stabilizer</span>
                          <span className={styles.rowLabel}>{row.stabilizer}</span>
                        </div>
                        <span className={styles.rowValueGroup}>
                          <span className={styles.insightMeta}>
                            {row.exposureCount} exercise{row.exposureCount === 1 ? "" : "s"}
                          </span>
                          <span className={styles.rowChevron} aria-hidden="true">
                            ›
                          </span>
                        </span>
                      </button>
                    ))}
                    {attribution.jointStress.map((row) => (
                      <button
                        key={`${row.joint}-${row.stressLevel}`}
                        type="button"
                        className={styles.insightRow}
                        onClick={() => {
                          setSelection({
                            kind: "joint",
                            joint: row.joint,
                            stressLevel: row.stressLevel,
                          });
                        }}
                        aria-label={`Open ${row.joint} ${row.stressLevel} joint consideration details`}
                      >
                        <div className={styles.insightRowMain}>
                          <span className={styles.insightLabel}>Joint stress</span>
                          <span className={styles.rowLabel}>
                            {formatJointLabel(row.joint, row.stressLevel)}
                          </span>
                        </div>
                        <span className={styles.rowValueGroup}>
                          <span className={styles.insightMeta}>
                            {row.exposureCount} exercise{row.exposureCount === 1 ? "" : "s"}
                          </span>
                          <span className={styles.rowChevron} aria-hidden="true">
                            ›
                          </span>
                        </span>
                      </button>
                    ))}
                  </>
                )}
              </div>
            </section>
          </div>
        </div>
      </section>

      <StudioModal
        open={detail != null}
        title={detail?.title ?? "Projected Volume"}
        onClose={() => {
          setSelection(null);
        }}
      >
        {detail ? (
          <div className={styles.detailBody}>
            <div className={styles.detailSummary}>
              <span className={styles.detailMetric}>{detail.totalValue}</span>
              <span className={styles.detailHint}>{detail.totalLabel}</span>
              <span className={styles.detailHint}>{detail.whyItMatters}</span>
              <span className={styles.detailDisclaimer}>
                Draft design projection, not logged execution.
              </span>
            </div>

            <section className={styles.detailSection}>
              <h3 className={styles.detailHeading}>Contributors</h3>
              <ul className={styles.detailList}>
                {detail.contributors.map((exercise) => (
                  <li key={`${exercise.blockTitle}-${exercise.exerciseName}`}>
                    <span>{exercise.exerciseName}</span>
                    <span className={styles.detailMeta}>
                      {exercise.blockTitle} · {formatSetCount(exercise.sets)}
                    </span>
                    {exercise.note ? (
                      <span className={styles.detailNote}>{exercise.note}</span>
                    ) : null}
                  </li>
                ))}
              </ul>
            </section>
          </div>
        ) : null}
      </StudioModal>
    </>
  );
}
