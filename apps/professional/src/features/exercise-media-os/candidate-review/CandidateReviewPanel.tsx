"use client";

import { useMemo } from "react";

import { buildCandidateQaScore } from "./buildCandidateQaScore";
import { isBenchPressProductExercise } from "../bench-press-product/benchPressProductConstants";
import type { CandidateReviewState, MissingKeyframeRequirement } from "./types";
import { resolveCandidateReviewStateForExercise } from "./resolveCandidateReviewState";

import styles from "./candidateReview.module.css";

type CandidateReviewPanelProps = {
  exerciseId: string | null;
};

function statusLabel(status: string): string {
  switch (status) {
    case "dev-test":
      return "Dev-test only";
    case "needs-revision":
      return "Needs revision";
    case "approved-master":
      return "Approved master";
    case "missing":
      return "Missing";
    case "rejected":
      return "Rejected";
    case "superseded":
      return "Superseded";
    default:
      return status;
  }
}

function imagePackReadinessLabel(readiness: CandidateReviewState["imagePackReadiness"]): string {
  switch (readiness) {
    case "missing":
      return "Missing — no keyframe candidates";
    case "incomplete":
      return "Incomplete — review in progress";
    case "review-ready":
      return "Review ready";
    case "approved-master-ready":
      return "Approved master ready";
    default:
      return readiness;
  }
}

export function CandidateReviewPanel({ exerciseId }: CandidateReviewPanelProps) {
  const reviewState = useMemo(() => {
    if (!exerciseId) {
      return null;
    }
    return resolveCandidateReviewStateForExercise(exerciseId);
  }, [exerciseId]);

  if (!exerciseId) {
    return null;
  }

  if (!isBenchPressProductExercise(exerciseId)) {
    return (
      <section className={styles.panel} data-testid="candidate-review-panel">
        <h6 className={styles.title}>Exercise Media Factory / Candidate Review</h6>
        <p className={styles.muted}>
          Candidate review will unlock after keyframe spec exists for this exercise.
        </p>
      </section>
    );
  }

  if (!reviewState) {
    return null;
  }

  const allCandidates = [
    ...reviewState.devTestCandidates,
    ...reviewState.needsRevisionCandidates,
    ...reviewState.approvedMasterCandidates,
    ...reviewState.rejectedCandidates,
    ...(reviewState.candidatesByStatus.draft ?? []),
  ];

  return (
    <section className={styles.panel} data-testid="candidate-review-panel" aria-label="Candidate review">
      <header className={styles.header}>
        <div>
          <h6 className={styles.title}>Exercise Media Factory / Candidate Review</h6>
          <p className={styles.muted}>Local-only review state — no upload or persistence.</p>
        </div>
        <span className={styles.localBadge}>Local review</span>
      </header>

      <div className={styles.summaryGrid}>
        <article className={styles.summaryCard}>
          <span className={styles.summaryLabel}>Image pack readiness</span>
          <strong>{imagePackReadinessLabel(reviewState.imagePackReadiness)}</strong>
        </article>
        <article className={styles.summaryCard}>
          <span className={styles.summaryLabel}>Dev-test</span>
          <strong>{reviewState.statusCounts["dev-test"]}</strong>
        </article>
        <article className={styles.summaryCard}>
          <span className={styles.summaryLabel}>Approved master</span>
          <strong>{reviewState.statusCounts["approved-master"]}</strong>
        </article>
        <article className={styles.summaryCard}>
          <span className={styles.summaryLabel}>Missing keyframes</span>
          <strong>{reviewState.missingKeyframeRequirements.length}</strong>
        </article>
      </div>

      {reviewState.missingKeyframeRequirements.length > 0 ? (
        <div className={styles.missingSection}>
          <h6 className={styles.subheading}>Missing keyframes</h6>
          <ul className={styles.list}>
            {reviewState.missingKeyframeRequirements.map((requirement: MissingKeyframeRequirement) => (
              <li key={requirement.poseId}>
                <strong>{requirement.label}</strong> — {requirement.reason}
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {reviewState.warnings.length > 0 ? (
        <div className={styles.warnings} role="note">
          {reviewState.warnings.map((warning: string) => (
            <p key={warning}>{warning}</p>
          ))}
        </div>
      ) : null}

      <p className={styles.nextAction}>
        <strong>Next:</strong> {reviewState.nextRecommendedAction.label}
      </p>

      {allCandidates.length > 0 ? (
        <div className={styles.candidateTableWrap}>
          <h6 className={styles.subheading}>Candidates</h6>
          <table className={styles.candidateTable}>
            <thead>
              <tr>
                <th scope="col">ID</th>
                <th scope="col">Type</th>
                <th scope="col">Slot / Pose</th>
                <th scope="col">Target</th>
                <th scope="col">Status</th>
                <th scope="col">Score</th>
                <th scope="col">Rights</th>
              </tr>
            </thead>
            <tbody>
              {allCandidates.map((candidate) => {
                const qaScore = buildCandidateQaScore({
                  qa: candidate.qa,
                  rights: candidate.rights,
                  status: candidate.status,
                });

                return (
                  <tr key={candidate.candidateId}>
                    <td>{candidate.candidateId}</td>
                    <td>{candidate.assetType}</td>
                    <td>{candidate.keyframePoseId ?? candidate.mediaSlotId ?? "—"}</td>
                    <td>{candidate.renderTarget}</td>
                    <td>
                      <span
                        className={
                          candidate.status === "dev-test"
                            ? styles.statusDevTest
                            : candidate.status === "approved-master"
                              ? styles.statusApproved
                              : styles.statusDefault
                        }
                      >
                        {statusLabel(candidate.status)}
                      </span>
                    </td>
                    <td>
                      {qaScore.score}
                      {qaScore.hardGateFailures.length > 0 ? (
                        <span className={styles.gateFailures} title={qaScore.hardGateFailures.join(", ")}>
                          {" "}
                          ({qaScore.hardGateFailures.length} gate failures)
                        </span>
                      ) : null}
                    </td>
                    <td>{candidate.rights.usageStatus}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ) : null}
    </section>
  );
}
