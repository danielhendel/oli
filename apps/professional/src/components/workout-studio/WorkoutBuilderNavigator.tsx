"use client";

import type { RefObject } from "react";

import { WorkoutQualityCard } from "@/components/workout-studio/WorkoutQualityCard";
import type { WorkoutQualityChecklist } from "@/features/workout-studio/buildWorkoutQualityChecklist";
import type { BuilderNavSection } from "@/features/workout-studio/workoutStudioNavigation";
import styles from "./WorkoutBuilderNavigator.module.css";

type WorkoutBuilderNavigatorProps = {
  qualityChecklist: WorkoutQualityChecklist;
  qualityRef: RefObject<HTMLDivElement | null>;
  totalSets: number;
  blockCount: number;
  exerciseCount: number;
  activeSection?: BuilderNavSection;
  onNavigate: (section: BuilderNavSection) => void;
  onPreview: () => void;
};

function qualityPercent(checklist: WorkoutQualityChecklist): number {
  if (checklist.items.length === 0) return 0;
  const complete = checklist.items.filter((item) => item.complete).length;
  return Math.round((complete / checklist.items.length) * 100);
}

const NAV_ITEMS: {
  id: BuilderNavSection;
  label: string;
  subtitle: (props: WorkoutBuilderNavigatorProps) => string;
}[] = [
  { id: "overview", label: "Overview", subtitle: () => "Workout meta" },
  {
    id: "projectedVolume",
    label: "Projected Volume",
    subtitle: (props) => `${props.totalSets} sets`,
  },
  {
    id: "blocks",
    label: "Blocks",
    subtitle: (props) => `${props.blockCount} blocks · ${props.exerciseCount} exercises`,
  },
  { id: "library", label: "Exercise Library", subtitle: () => "Add from catalog" },
  {
    id: "quality",
    label: "Workout Quality",
    subtitle: (props) => `${qualityPercent(props.qualityChecklist)}% complete`,
  },
  { id: "preview", label: "Preview", subtitle: () => "Client experience" },
  { id: "tools", label: "Notes / Tools", subtitle: () => "Studio helpers" },
];

export function WorkoutBuilderNavigator(props: WorkoutBuilderNavigatorProps) {
  const percent = qualityPercent(props.qualityChecklist);

  return (
    <nav className={styles.navigator} aria-label="Workout builder navigator">
      <div className={styles.signals}>
        <div className={styles.signal}>
          <span className={styles.signalLabel}>Quality</span>
          <strong>{percent}%</strong>
        </div>
        <div className={styles.signal}>
          <span className={styles.signalLabel}>Sets</span>
          <strong>{props.totalSets}</strong>
        </div>
        <div className={styles.signal}>
          <span className={styles.signalLabel}>Blocks</span>
          <strong>{props.blockCount}</strong>
        </div>
        <div className={styles.signal}>
          <span className={styles.signalLabel}>Exercises</span>
          <strong>{props.exerciseCount}</strong>
        </div>
      </div>

      <ul className={styles.navList}>
        {NAV_ITEMS.map((item) => (
          <li key={item.id}>
            <button
              type="button"
              className={`${styles.navItem} ${
                props.activeSection === item.id ? styles.navItemActive : ""
              }`}
              onClick={() => {
                if (item.id === "preview") {
                  props.onPreview();
                  return;
                }
                props.onNavigate(item.id);
              }}
            >
              <span className={styles.navDot} aria-hidden="true" />
              <span className={styles.navText}>
                <span className={styles.navLabel}>{item.label}</span>
                <span className={styles.navSubtitle}>{item.subtitle(props)}</span>
              </span>
            </button>
          </li>
        ))}
      </ul>

      <div ref={props.qualityRef} id="studio-quality" className={styles.qualityPanel}>
        <WorkoutQualityCard checklist={props.qualityChecklist} />
      </div>
    </nav>
  );
}
