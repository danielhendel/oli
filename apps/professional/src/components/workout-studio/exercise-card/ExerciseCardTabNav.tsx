"use client";

import type { ExerciseCardTab } from "./types";
import { EXERCISE_CARD_TAB_LABELS, EXERCISE_CARD_TABS } from "./types";
import styles from "./exerciseCard.module.css";

type ExerciseCardTabNavProps = {
  activeTab: ExerciseCardTab;
  onTabChange: (tab: ExerciseCardTab) => void;
};

export function ExerciseCardTabNav({ activeTab, onTabChange }: ExerciseCardTabNavProps) {
  return (
    <nav className={styles.tabNav} aria-label="Exercise workspace sections">
      {EXERCISE_CARD_TABS.map((tab) => (
        <button
          key={tab}
          type="button"
          role="tab"
          aria-selected={activeTab === tab}
          className={`${styles.tabButton} ${activeTab === tab ? styles.tabButtonActive : ""}`}
          onClick={() => {
            onTabChange(tab);
          }}
        >
          {EXERCISE_CARD_TAB_LABELS[tab]}
        </button>
      ))}
    </nav>
  );
}
