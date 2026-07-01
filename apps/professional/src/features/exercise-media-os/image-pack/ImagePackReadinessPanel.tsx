"use client";

import { useMemo } from "react";

import { isBenchPressProductExercise } from "../bench-press-product/benchPressProductConstants";
import { buildBenchPressImagePack } from "./buildBenchPressImagePack";
import { buildBenchPressImageSequencePlaybackPlan } from "./buildBenchPressImageSequencePlaybackPlan";
import { buildBenchPressKeyframeSpec } from "../keyframe-spec/buildBenchPressKeyframeSpec";
import type { ImagePackStatus } from "./types";

import styles from "./imagePackReadiness.module.css";

type ImagePackReadinessPanelProps = {
  exerciseId: string | null;
};

function statusLabel(status: ImagePackStatus): string {
  switch (status) {
    case "missing":
      return "Missing";
    case "incomplete":
      return "Incomplete";
    case "review-ready":
      return "Review ready";
    case "approved-master":
      return "Approved master";
    case "superseded":
      return "Superseded";
    default:
      return status;
  }
}

export function ImagePackReadinessPanel({ exerciseId }: ImagePackReadinessPanelProps) {
  const { imagePack, playbackPlan } = useMemo(() => {
    if (!exerciseId || !isBenchPressProductExercise(exerciseId)) {
      return { imagePack: null, playbackPlan: null };
    }

    const pack = buildBenchPressImagePack();
    const keyframeSpec = buildBenchPressKeyframeSpec();
    const plan = buildBenchPressImageSequencePlaybackPlan({
      imagePack: pack,
      keyframeSpec,
    });

    return { imagePack: pack, playbackPlan: plan };
  }, [exerciseId]);

  if (!exerciseId) {
    return null;
  }

  if (!isBenchPressProductExercise(exerciseId)) {
    return (
      <section className={styles.panel} data-testid="image-pack-readiness-panel">
        <h6 className={styles.title}>Exercise Media Factory / Image Pack</h6>
        <p className={styles.muted}>Image pack unlocks after keyframe spec exists.</p>
      </section>
    );
  }

  if (!imagePack || !playbackPlan) {
    return null;
  }

  return (
    <section
      className={styles.panel}
      data-testid="image-pack-readiness-panel"
      aria-label="Image pack readiness"
    >
      <header className={styles.header}>
        <div>
          <h6 className={styles.title}>Exercise Media Factory / Image Pack</h6>
          <p className={styles.muted}>Local-only image pack state — no upload or persistence.</p>
        </div>
        <span className={styles.localBadge}>Local review</span>
      </header>

      <div className={styles.summaryGrid}>
        <article className={styles.summaryCard}>
          <span className={styles.summaryLabel}>Pack status</span>
          <strong data-testid="image-pack-status">{statusLabel(imagePack.status)}</strong>
        </article>
        <article className={styles.summaryCard}>
          <span className={styles.summaryLabel}>Coverage</span>
          <strong>{imagePack.coverageLevel}</strong>
        </article>
        <article className={styles.summaryCard}>
          <span className={styles.summaryLabel}>Approved keyframes</span>
          <strong>{imagePack.approvedPoseIds.length}</strong>
        </article>
        <article className={styles.summaryCard}>
          <span className={styles.summaryLabel}>Missing keyframes</span>
          <strong data-testid="missing-keyframe-count">{imagePack.missingPoseIds.length}</strong>
        </article>
      </div>

      {imagePack.missingPoseIds.length > 0 ? (
        <div className={styles.missingSection}>
          <h6 className={styles.subheading}>Missing keyframes</h6>
          <ul className={styles.list}>
            {imagePack.missingPoseIds.map((poseId) => (
              <li key={poseId}>
                <strong>{poseId}</strong>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {imagePack.incompletePoseIds.length > 0 ? (
        <div className={styles.missingSection}>
          <h6 className={styles.subheading}>Incomplete / revision keyframes</h6>
          <ul className={styles.list}>
            {imagePack.incompletePoseIds.map((poseId) => (
              <li key={poseId}>
                <strong>{poseId}</strong>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      <div className={styles.qaRow}>
        <span>QA min score: {imagePack.qaSummary.minimumScore}</span>
        <span>Rights cleared: {imagePack.qaSummary.rightsCleared ? "Yes" : "No"}</span>
        <span>Hard gate failures: {imagePack.qaSummary.hardGateFailureCount}</span>
      </div>

      <div className={styles.warnings} role="note">
        <p>Live image pack is not approved-master until all required keyframes pass QA and rights.</p>
        <p>Dev-test images do not count as approved master.</p>
        {imagePack.warnings.map((warning) => (
          <p key={warning}>{warning}</p>
        ))}
      </div>

      <div className={styles.sequencePreview} data-testid="image-sequence-preview">
        <h6 className={styles.subheading}>Image sequence preview</h6>
        <ul className={styles.frameList}>
          {playbackPlan.frames.map((frame) => (
            <li key={frame.frameId} className={styles.frameItem}>
              {frame.status === "available" && frame.publicPath ? (
                <img
                  src={frame.publicPath}
                  alt={frame.altText}
                  className={styles.frameImage}
                />
              ) : (
                <div className={styles.framePlaceholder} aria-label={frame.altText}>
                  <span>{frame.title}</span>
                  <span className={styles.placeholderLabel}>Pending</span>
                </div>
              )}
              <div className={styles.frameMeta}>
                <strong>{frame.title}</strong>
                <p>{frame.coachingCaption}</p>
              </div>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
