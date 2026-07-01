"use client";

import { useMemo } from "react";

import { buildTop25KeyframeSpecRegistryReadiness } from "./buildTop25KeyframeSpecRegistryReadiness";

import styles from "./top25KeyframeSpecReadiness.module.css";

export function Top25KeyframeSpecReadinessPanel() {
  const report = useMemo(() => buildTop25KeyframeSpecRegistryReadiness(), []);

  return (
    <section
      className={styles.panel}
      data-testid="top25-keyframe-spec-readiness-panel"
      aria-label="Top 25 keyframe spec readiness"
    >
      <header className={styles.header}>
        <div>
          <h6 className={styles.title}>Exercise Media Factory / Top 25 Keyframe Specs</h6>
          <p className={styles.muted}>Local-only spec registry — no upload or persistence.</p>
        </div>
        <span className={styles.localBadge}>Spec blueprint</span>
      </header>

      <p className={styles.warning}>
        Keyframe specs are production blueprints, not generated or approved media.
      </p>

      <div className={styles.summaryGrid}>
        <div className={styles.metric}>
          <span className={styles.metricLabel}>Top 25 specs</span>
          <strong>{report.specCount}</strong>
        </div>
        <div className={styles.metric}>
          <span className={styles.metricLabel}>Valid specs</span>
          <strong>{report.validSpecCount}</strong>
        </div>
        <div className={styles.metric}>
          <span className={styles.metricLabel}>Readiness</span>
          <strong>{report.readinessLabel}</strong>
        </div>
        <div className={styles.metric}>
          <span className={styles.metricLabel}>Bench Press aligned</span>
          <strong>{report.benchPressAligned ? "Yes" : "No"}</strong>
        </div>
        <div className={styles.metric}>
          <span className={styles.metricLabel}>Character coverage</span>
          <strong>
            {report.characterCoverage}/{report.totalTop25Exercises}
          </strong>
        </div>
        <div className={styles.metric}>
          <span className={styles.metricLabel}>Pose coverage</span>
          <strong>
            {report.poseCoverage}/{report.totalTop25Exercises}
          </strong>
        </div>
        <div className={styles.metric}>
          <span className={styles.metricLabel}>Render targets</span>
          <strong>
            {report.renderTargetCoverage}/{report.totalTop25Exercises}
          </strong>
        </div>
        <div className={styles.metric}>
          <span className={styles.metricLabel}>Expert review gap</span>
          <strong>{report.needsExpertReviewCount}</strong>
        </div>
        <div className={styles.metric}>
          <span className={styles.metricLabel}>Media approved</span>
          <strong>{report.mediaApprovedCount}</strong>
        </div>
      </div>

      {report.nextRecommendedActions.length > 0 ? (
        <div className={styles.actions}>
          <h6 className={styles.actionsTitle}>Next recommended actions</h6>
          <ul>
            {report.nextRecommendedActions.map((action) => (
              <li key={action}>{action}</li>
            ))}
          </ul>
        </div>
      ) : null}
    </section>
  );
}
