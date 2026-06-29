"use client";

import type { ReactNode } from "react";

import type { ExerciseCardTab } from "./types";
import { EXERCISE_CARD_TAB_HINTS, EXERCISE_CARD_TAB_LABELS } from "./types";
import styles from "./exerciseCard.module.css";

type TabPanelShellProps = {
  tab: ExerciseCardTab;
  icon: string;
  children: ReactNode;
  panelTitle?: string;
  panelSubtitle?: string;
};

export function TabPanelShell({
  tab,
  icon,
  children,
  panelTitle,
  panelSubtitle,
}: TabPanelShellProps) {
  const title = panelTitle ?? EXERCISE_CARD_TAB_LABELS[tab];
  const subtitle = panelSubtitle ?? EXERCISE_CARD_TAB_HINTS[tab];

  return (
    <section className={styles.tabPanel} role="tabpanel">
      <header className={styles.tabPanelHeader}>
        <span className={styles.tabPanelIcon} aria-hidden="true">
          {icon}
        </span>
        <div>
          <h5 className={styles.tabPanelTitle}>{title}</h5>
          <p className={styles.tabPanelSubtitle}>{subtitle}</p>
        </div>
      </header>
      <div className={styles.tabPanelBody}>{children}</div>
    </section>
  );
}
