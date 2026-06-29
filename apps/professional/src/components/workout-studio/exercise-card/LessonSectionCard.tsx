"use client";

import { useState } from "react";

import styles from "./exerciseCard.module.css";

type LessonSectionCardProps = {
  title: string;
  summary: string;
  qualityLabel?: string;
  mediaStatus?: "missing" | "planned" | "complete";
  value: string;
  multiline?: boolean;
  onChange: (value: string) => void;
};

export function LessonSectionCard({
  title,
  summary,
  qualityLabel,
  mediaStatus,
  value,
  multiline = true,
  onChange,
}: LessonSectionCardProps) {
  const [editing, setEditing] = useState(false);
  const preview = value.trim() || summary;

  return (
    <article className={styles.lessonCard}>
      <div className={styles.lessonCardHeader}>
        <div>
          <h6 className={styles.lessonCardTitle}>{title}</h6>
          {!editing ? <p className={styles.lessonCardSummary}>{preview}</p> : null}
        </div>
        <div className={styles.lessonCardMeta}>
          {qualityLabel ? <span className={styles.qualityPill}>{qualityLabel}</span> : null}
          {mediaStatus ? (
            <span className={styles.mediaStatusMini}>{mediaStatus}</span>
          ) : null}
          <button
            type="button"
            className={styles.editButton}
            onClick={() => {
              setEditing((open) => !open);
            }}
          >
            {editing ? "Done" : "Edit"}
          </button>
        </div>
      </div>
      {editing ? (
        <div className={styles.lessonCardEditor}>
          {multiline ? (
            <textarea
              rows={5}
              value={value}
              onChange={(event) => {
                onChange(event.target.value);
              }}
            />
          ) : (
            <input
              type="text"
              value={value}
              onChange={(event) => {
                onChange(event.target.value);
              }}
            />
          )}
        </div>
      ) : null}
    </article>
  );
}
