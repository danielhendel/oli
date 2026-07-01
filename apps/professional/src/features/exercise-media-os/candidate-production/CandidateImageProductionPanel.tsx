"use client";

import { useMemo } from "react";

import { buildExerciseEnrichmentExpertReviewState } from "@oli/lib/workouts/exercises/enrichment/expert-review/buildExerciseEnrichmentExpertReviewState";
import { listTop25ExerciseExpertReviewQueue } from "@oli/lib/workouts/exercises/enrichment/expert-review/top25ExerciseExpertReviewQueue.v1";

import { buildLiveTop25CandidateImageProductionPackets } from "./buildTop25CandidateImageProductionPackets";

import styles from "./candidateImageProduction.module.css";

export function CandidateImageProductionPanel() {
  const { reviewState, production } = useMemo(() => {
    const reviewItems = listTop25ExerciseExpertReviewQueue();
    return {
      reviewState: buildExerciseEnrichmentExpertReviewState(reviewItems),
      production: buildLiveTop25CandidateImageProductionPackets(),
    };
  }, []);

  const previewPackets = production.packets.slice(0, 10);

  return (
    <section
      className={styles.panel}
      data-testid="candidate-image-production-panel"
      aria-label="Candidate image production workflow"
    >
      <header className={styles.header}>
        <div>
          <h6 className={styles.title}>Exercise Media Factory / Candidate Production</h6>
          <p className={styles.muted}>Local workflow — external Google Flow instructions only.</p>
        </div>
        <span className={styles.localBadge}>Planning</span>
      </header>

      <p className={styles.warning}>
        Production packets are external-generation instructions, not generated assets or approved media.
      </p>

      <div className={styles.summaryGrid}>
        <div className={styles.metric}>
          <span className={styles.metricLabel}>Expert review approved</span>
          <strong>{reviewState.approvedForProductionCount}</strong>
        </div>
        <div className={styles.metric}>
          <span className={styles.metricLabel}>Blocked exercises</span>
          <strong>{reviewState.blockedExerciseIds.length}</strong>
        </div>
        <div className={styles.metric}>
          <span className={styles.metricLabel}>Total packets</span>
          <strong>{production.totalPackets}</strong>
        </div>
        <div className={styles.metric}>
          <span className={styles.metricLabel}>Ready packets</span>
          <strong>{production.readyPacketCount}</strong>
        </div>
        <div className={styles.metric}>
          <span className={styles.metricLabel}>Blocked packets</span>
          <strong>{production.blockedPacketCount}</strong>
        </div>
      </div>

      {previewPackets.length > 0 ? (
        <div className={styles.packetList}>
          <h6 className={styles.listTitle}>First 10 packet summaries</h6>
          <ul>
            {previewPackets.map((packet) => (
              <li key={packet.productionPacketId}>
                <strong>{packet.exerciseId}</strong> · {packet.keyframePoseId} · {packet.renderTarget}{" "}
                · <span className={styles.status}>{packet.status}</span>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {production.nextRecommendedActions.length > 0 ? (
        <div className={styles.actions}>
          <h6 className={styles.listTitle}>Next recommended actions</h6>
          <ul>
            {production.nextRecommendedActions.map((action) => (
              <li key={action}>{action}</li>
            ))}
          </ul>
        </div>
      ) : null}
    </section>
  );
}
