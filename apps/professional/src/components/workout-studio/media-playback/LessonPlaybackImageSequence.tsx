"use client";

import { useCallback, useState } from "react";

import type { ImageSequencePlaybackPlan } from "@/features/exercise-media-os/image-pack/types";

import styles from "./LessonPlaybackImageSequence.module.css";

type LessonPlaybackImageSequenceProps = {
  plan: ImageSequencePlaybackPlan;
};

export function LessonPlaybackImageSequence({ plan }: LessonPlaybackImageSequenceProps) {
  const [activeIndex, setActiveIndex] = useState(0);
  const frame = plan.frames[activeIndex];

  const goPrevious = useCallback(() => {
    setActiveIndex((index) => Math.max(0, index - 1));
  }, []);

  const goNext = useCallback(() => {
    setActiveIndex((index) => Math.min(plan.frames.length - 1, index + 1));
  }, [plan.frames.length]);

  if (!frame) {
    return (
      <div className={styles.empty} data-testid="image-sequence-empty">
        No keyframe sequence available.
      </div>
    );
  }

  return (
    <section
      className={styles.sequence}
      data-testid="lesson-playback-image-sequence"
      aria-label="Keyframe image sequence"
    >
      <header className={styles.header}>
        <span className={styles.kicker}>Image sequence · {plan.status}</span>
        <h3 className={styles.title}>{frame.title}</h3>
      </header>

      <div className={styles.stage}>
        {frame.status === "available" && frame.publicPath ? (
          <img
            src={frame.publicPath}
            alt={frame.altText}
            className={styles.image}
          />
        ) : (
          <div className={styles.placeholder} role="img" aria-label={frame.altText}>
            <span className={styles.placeholderTitle}>{frame.title}</span>
            <span className={styles.placeholderHint}>Keyframe pending production</span>
          </div>
        )}
      </div>

      <p className={styles.caption}>{frame.coachingCaption}</p>

      <div className={styles.controls}>
        <button
          type="button"
          className={styles.navButton}
          onClick={goPrevious}
          disabled={activeIndex === 0}
          aria-label="Previous keyframe"
        >
          Previous
        </button>
        <span className={styles.counter} aria-live="polite">
          {activeIndex + 1} / {plan.frames.length}
        </span>
        <button
          type="button"
          className={styles.navButton}
          onClick={goNext}
          disabled={activeIndex >= plan.frames.length - 1}
          aria-label="Next keyframe"
        >
          Next
        </button>
      </div>

      {plan.warnings.length > 0 ? (
        <div className={styles.warnings} role="note">
          {plan.warnings.map((warning) => (
            <p key={warning}>{warning}</p>
          ))}
        </div>
      ) : null}
    </section>
  );
}
