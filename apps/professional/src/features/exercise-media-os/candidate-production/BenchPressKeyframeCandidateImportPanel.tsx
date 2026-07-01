"use client";

import { useMemo, useState } from "react";

import { buildCandidateImageQaReadiness } from "../candidate-review/buildCandidateImageQaReadiness";
import { buildBenchPressKeyframeCandidateQaWorksheet } from "../candidate-review/buildBenchPressKeyframeCandidateQaWorksheet";
import { buildBenchPressImportedCandidateReviewState } from "./buildBenchPressImportedCandidateReviewState";
import { buildBenchPressImportedImageCandidates } from "./buildBenchPressImportedImageCandidates";
import { buildBenchPressKeyframeImportManifest } from "./buildBenchPressKeyframeImportManifest";

import styles from "./benchPressKeyframeCandidateImport.module.css";

type KeyframeRowProps = {
  readonly poseId: string;
  readonly expectedPublicPath: string;
  readonly fileExists: boolean;
  readonly candidateStatus: string | null;
  readonly readinessLabel: string;
};

function KeyframeImportRow({
  poseId,
  expectedPublicPath,
  fileExists,
  candidateStatus,
  readinessLabel,
}: KeyframeRowProps) {
  const [imageError, setImageError] = useState(false);
  const showPreview = fileExists && !imageError;

  return (
    <li className={styles.keyframeRow}>
      <div className={styles.keyframeMeta}>
        <strong>{poseId}</strong>
        <span className={styles.path}>{expectedPublicPath}</span>
        <span className={fileExists ? styles.exists : styles.missing}>
          {fileExists ? "File exists" : "Missing"}
        </span>
        {candidateStatus ? (
          <span className={styles.candidateStatus}>Candidate: {candidateStatus}</span>
        ) : (
          <span className={styles.candidateStatus}>No candidate</span>
        )}
        <span className={styles.readiness}>QA: {readinessLabel}</span>
      </div>
      <div className={styles.previewSlot}>
        {showPreview ? (
          <img
            src={expectedPublicPath}
            alt={`Bench Press ${poseId} keyframe preview`}
            className={styles.previewImage}
            onError={() => {
              setImageError(true);
            }}
          />
        ) : (
          <div className={styles.placeholder} aria-label={`${poseId} keyframe placeholder`}>
            {fileExists ? "Preview unavailable" : "Awaiting PNG import"}
          </div>
        )}
      </div>
    </li>
  );
}

export function BenchPressKeyframeCandidateImportPanel() {
  const { manifest, imported, reviewState } = useMemo(() => {
    const importManifest = buildBenchPressKeyframeImportManifest();
    const importedResult = buildBenchPressImportedImageCandidates(importManifest);
    const review = buildBenchPressImportedCandidateReviewState({
      importManifest,
      importedCandidates: importedResult.candidates,
    });
    return {
      manifest: importManifest,
      imported: importedResult,
      reviewState: review,
    };
  }, []);

  const candidateByPose = useMemo(() => {
    const map = new Map<string, (typeof imported.candidates)[number]>();
    for (const candidate of imported.candidates) {
      if (candidate.keyframePoseId) {
        map.set(candidate.keyframePoseId, candidate);
      }
    }
    return map;
  }, [imported.candidates]);

  return (
    <section
      className={styles.panel}
      data-testid="bench-press-keyframe-candidate-import-panel"
      aria-label="Bench Press keyframe candidate import"
    >
      <header className={styles.header}>
        <div>
          <h6 className={styles.title}>Bench Press Keyframe Candidate Import</h6>
          <p className={styles.muted}>Local import manifest and human QA — no upload or persistence.</p>
        </div>
        <span className={styles.localBadge}>Local-only</span>
      </header>

      <p className={styles.warning}>
        Imported images are draft/dev-test candidates only. Human QA is required before master approval.
      </p>

      <div className={styles.summaryGrid}>
        <div className={styles.metric}>
          <span className={styles.metricLabel}>Expected files</span>
          <strong>{manifest.expectedItemCount}</strong>
        </div>
        <div className={styles.metric}>
          <span className={styles.metricLabel}>Importable</span>
          <strong>{manifest.importableItemCount}</strong>
        </div>
        <div className={styles.metric}>
          <span className={styles.metricLabel}>Missing</span>
          <strong>{manifest.missingItemCount}</strong>
        </div>
        <div className={styles.metric}>
          <span className={styles.metricLabel}>Imported candidates</span>
          <strong>{imported.candidates.length}</strong>
        </div>
        <div className={styles.metric}>
          <span className={styles.metricLabel}>Image pack readiness</span>
          <strong>{reviewState.candidateReviewState.imagePackReadiness}</strong>
        </div>
      </div>

      <ul className={styles.keyframeList}>
        {manifest.items.map((item) => {
          const candidate = candidateByPose.get(item.keyframePoseId) ?? null;
          const worksheet = candidate
            ? buildBenchPressKeyframeCandidateQaWorksheet(candidate)
            : null;
          const readiness = buildCandidateImageQaReadiness({ candidate, worksheet });

          return (
            <KeyframeImportRow
              key={item.importItemId}
              poseId={item.keyframePoseId}
              expectedPublicPath={item.expectedPublicPath}
              fileExists={item.fileExists}
              candidateStatus={candidate?.status ?? null}
              readinessLabel={readiness.readinessLabel}
            />
          );
        })}
      </ul>

      {reviewState.warnings.length > 0 ? (
        <div className={styles.actions}>
          <h6 className={styles.listTitle}>Warnings</h6>
          <ul>
            {reviewState.warnings.map((warning) => (
              <li key={warning}>{warning}</li>
            ))}
          </ul>
        </div>
      ) : null}
    </section>
  );
}
