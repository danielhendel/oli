"use client";

import { useMemo } from "react";

import { buildBenchPressExerciseProductPipeline } from "@/features/exercise-media-os/bench-press-product/buildBenchPressExerciseProductPipeline";
import { getProductionSceneBrief } from "@/features/exercise-media-os/bench-press-product/buildBenchPressProductionBrief";
import { countRequiredQAChecks } from "@/features/exercise-media-os/bench-press-product/buildBenchPressExpertMediaQAChecklist";
import { formatLessonDuration } from "./mediaLessonDirectorUi";
import styles from "./productionPipeline.module.css";

type ProductionPipelineSectionProps = {
  expanded: boolean;
  onToggleExpanded: () => void;
  briefSceneId: string | null;
  onViewBrief: (sceneId: string | null) => void;
};

export function ProductionPipelineSection({
  expanded,
  onToggleExpanded,
  briefSceneId,
  onViewBrief,
}: ProductionPipelineSectionProps) {
  const pipeline = useMemo(() => buildBenchPressExerciseProductPipeline(), []);

  const requiredQaCount = countRequiredQAChecks(pipeline.qaChecklist);
  const activeBrief = briefSceneId
    ? getProductionSceneBrief(pipeline.productionBrief, briefSceneId)
    : undefined;
  const activeSceneQa = briefSceneId
    ? pipeline.qaChecklist.sceneChecks.find((scene) => scene.sceneId === briefSceneId)
    : undefined;

  const academyRefCount = pipeline.storyboard.scenes.reduce(
    (sum, scene) => sum + scene.academyReferences.length + scene.intelligenceReferences.length,
    0,
  );

  return (
    <section className={styles.productionPipeline} data-testid="production-pipeline">
      <button
        type="button"
        className={styles.collapseButton}
        aria-expanded={expanded}
        onClick={() => {
          onToggleExpanded();
        }}
      >
        <div>
          <h6 className={styles.collapseTitle}>Production Pipeline</h6>
          <p className={styles.collapseMeta}>
            Storyboard: Ready · Production Brief: Ready · Expert QA: Not reviewed · Assets:
            Placeholder only
          </p>
        </div>
        <span className={styles.collapseChevron}>{expanded ? "−" : "+"}</span>
      </button>

      {expanded ? (
        <div className={styles.collapseBody}>
          <div className={styles.summaryGrid}>
            <article className={styles.summaryCard}>
              <h6>Storyboard</h6>
              <p className={styles.statusReady}>Ready</p>
              <p>{pipeline.storyboard.scenes.length} scenes</p>
              <p>{formatLessonDuration(pipeline.storyboard.totalDurationSeconds)}</p>
              <p>{academyRefCount} Academy / Intelligence refs</p>
            </article>
            <article className={styles.summaryCard}>
              <h6>Production Brief</h6>
              <p className={styles.statusReady}>AI prompt pack ready</p>
              <p>Shot lists ready</p>
              <p>Overlay plans ready</p>
            </article>
            <article className={styles.summaryCard}>
              <h6>Expert QA</h6>
              <p className={styles.statusPending}>Not reviewed</p>
              <p>{requiredQaCount} required checks</p>
              <p>{pipeline.qaChecklist.approvalGate.message}</p>
            </article>
          </div>

          {activeBrief && briefSceneId ? (
            <div className={styles.briefPanel} data-testid="scene-brief-panel">
              <header className={styles.briefPanelHeader}>
                <div>
                  <h6>{activeBrief.title}</h6>
                  <p>{activeBrief.objective}</p>
                </div>
                <button
                  type="button"
                  className={styles.closeBrief}
                  onClick={() => {
                    onViewBrief(null);
                  }}
                >
                  Close
                </button>
              </header>

              <div className={styles.briefGrid}>
                <div className={styles.briefSection}>
                  <span className={styles.briefSectionLabel}>Narration script</span>
                  <p>{activeBrief.narrationScript}</p>
                </div>
                <div className={styles.briefSection}>
                  <span className={styles.briefSectionLabel}>On-screen text</span>
                  <p>{activeBrief.onScreenText}</p>
                </div>
              </div>

              <div className={styles.briefSection}>
                <span className={styles.briefSectionLabel}>Shot list</span>
                <ul className={styles.briefList}>
                  {activeBrief.shotList.map((shot) => (
                    <li key={shot.shotId}>
                      {shot.cameraAngle} · {shot.framing} · {shot.durationSeconds}s — {shot.purpose}
                    </li>
                  ))}
                </ul>
              </div>

              <div className={styles.briefSection}>
                <span className={styles.briefSectionLabel}>Overlay plan</span>
                <ul className={styles.briefList}>
                  {activeBrief.overlayPlan.map((overlay) => (
                    <li key={overlay.overlayId}>
                      {overlay.type}: {overlay.target} — {overlay.description}
                    </li>
                  ))}
                </ul>
              </div>

              <div className={styles.briefSection}>
                <span className={styles.briefSectionLabel}>AI generation prompt</span>
                <p>{activeBrief.aiGenerationPrompt}</p>
              </div>

              <div className={styles.briefSection}>
                <span className={styles.briefSectionLabel}>Negative prompt</span>
                <p>{activeBrief.aiNegativePrompt}</p>
              </div>

              {activeBrief.biomechanicsConstraints.length > 0 ? (
                <div className={styles.briefSection}>
                  <span className={styles.briefSectionLabel}>Biomechanics constraints</span>
                  <ul className={styles.briefList}>
                    {activeBrief.biomechanicsConstraints.map((constraint) => (
                      <li key={constraint.constraintId}>
                        [{constraint.severity}] {constraint.label}: {constraint.requirement}
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}

              {activeSceneQa ? (
                <div className={styles.briefSection}>
                  <span className={styles.briefSectionLabel}>QA checklist</span>
                  {activeSceneQa.checks.map((item) => (
                    <div key={item.checkId} className={styles.qaItem}>
                      [{item.severity}] {item.label}: {item.requirement}
                    </div>
                  ))}
                </div>
              ) : null}
            </div>
          ) : null}
        </div>
      ) : null}
    </section>
  );
}

export function ProductionPipelineViewBriefButton({
  sceneId,
  onViewBrief,
}: {
  sceneId: string;
  onViewBrief: (sceneId: string) => void;
}) {
  return (
    <button
      type="button"
      className={styles.viewBriefButton}
      onClick={(event) => {
        event.stopPropagation();
        onViewBrief(sceneId);
      }}
    >
      View Brief
    </button>
  );
}
