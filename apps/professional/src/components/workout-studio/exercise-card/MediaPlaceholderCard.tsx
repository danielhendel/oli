"use client";

import styles from "./exerciseCard.module.css";

type MediaPlaceholderCardProps = {
  title: string;
  status: "missing" | "planned" | "complete";
  description?: string;
};

const STATUS_LABELS: Record<MediaPlaceholderCardProps["status"], string> = {
  missing: "Missing",
  planned: "Planned",
  complete: "Complete",
};

export function MediaPlaceholderCard({ title, status, description }: MediaPlaceholderCardProps) {
  return (
    <article className={styles.mediaCard}>
      <div className={styles.mediaPreview}>
        <span className={styles.mediaPreviewIcon}>▶</span>
      </div>
      <div className={styles.mediaCardBody}>
        <div className={styles.mediaCardTop}>
          <h6 className={styles.mediaCardTitle}>{title}</h6>
          <span className={`${styles.mediaStatus} ${styles[`mediaStatus_${status}`]}`}>
            {STATUS_LABELS[status]}
          </span>
        </div>
        {description ? <p className={styles.mediaCardDescription}>{description}</p> : null}
        <div className={styles.mediaCardActions}>
          <button type="button" className={styles.mediaActionPrimary} disabled>
            Add Media
          </button>
          <button type="button" className={styles.mediaActionGhost} disabled>
            AI Generate
          </button>
          <button type="button" className={styles.mediaActionGhost} disabled>
            Record Coach Video
          </button>
          <button type="button" className={styles.mediaActionGhost} disabled>
            Upload
          </button>
        </div>
      </div>
    </article>
  );
}
