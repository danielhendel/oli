import type { ExerciseThumbnailSource } from "@/features/workout-studio/resolveExerciseThumbnail";
import styles from "./ExerciseThumbnail.module.css";

type ExerciseThumbnailProps = {
  readonly source: ExerciseThumbnailSource;
  readonly size?: "sm" | "md" | "lg";
};

function placeholderInitial(source: ExerciseThumbnailSource): string {
  const label = source.label.trim() || source.alt;
  return label.charAt(0).toUpperCase() || "E";
}

function sizeClass(size: NonNullable<ExerciseThumbnailProps["size"]>): string {
  if (size === "sm") return styles.thumbnailSm ?? "";
  if (size === "lg") return styles.thumbnailLg ?? "";
  return styles.thumbnailMd ?? "";
}

export function ExerciseThumbnail({ source, size = "md" }: ExerciseThumbnailProps) {
  const resolvedSizeClass = sizeClass(size);

  if (source.isRenderableImage && source.src) {
    return (
      <div className={`${styles.thumbnailWrap} ${resolvedSizeClass}`}>
        <img className={styles.thumbnailImage} src={source.src} alt={source.alt} />
        {source.kind !== "approved-master-image" ? (
          <span className={styles.thumbnailBadge}>{source.label}</span>
        ) : null}
      </div>
    );
  }

  return (
    <div
      className={`${styles.placeholder} ${resolvedSizeClass} ${styles[`placeholder_${source.kind}`]}`}
      aria-label={source.alt}
      title={source.label}
    >
      <span className={styles.placeholderInitial}>{placeholderInitial(source)}</span>
      <span className={styles.placeholderLabel}>{source.label}</span>
    </div>
  );
}
