"use client";

import { useMemo, useState } from "react";

import { applyMediaComposerPatch } from "@/features/exercise-media-os/buildMediaComposerState";
import { isBenchPressProductExercise } from "@/features/exercise-media-os/bench-press-product/benchPressProductConstants";
import {
  countApprovedPlayableVideoAssets,
  getMediaAssetForSlot,
  mediaAssetPlaybackLabel,
  mediaAssetStatusLabel,
} from "@/features/exercise-media-os/mediaAssetRegistry";
import type { DifficultyLevel, TeachingStyle, VisualEmphasis } from "@/features/exercise-media-os/types";
import { getExerciseMediaOsBundle } from "@/features/exercise-media-os/exerciseMediaRegistry";
import type { WorkoutExerciseCard } from "@/features/workout-studio/types";

import {
  buildLessonNarrativeScenes,
  EXPERIENCE_ROADMAP_CARDS,
  formatExperienceDuration,
  resolveSelectedGoal,
  teachingStyleLabel,
} from "./exerciseExperienceBuilderUi";
import styles from "./exerciseExperience.module.css";
import {
  buildFocusCardsForExercise,
  COACH_MESSAGE_MAX,
  DIFFICULTY_PILLS,
  formatLessonDuration,
  getModuleIcon,
  readinessLabel,
  readinessStars,
  TEACHING_STYLE_CARDS,
} from "./mediaLessonDirectorUi";
import {
  formatAssetKindLabel,
  formatSlotStatusLabel,
  resolveSlotForSceneKey,
} from "./mediaSlotDisplayUi";
import {
  ProductionPipelineSection,
  ProductionPipelineViewBriefButton,
} from "./ProductionPipelineSection";
import { TabPanelShell } from "./TabPanelShell";

type ExerciseMediaTabProps = {
  exercise: WorkoutExerciseCard;
  onUpdate: (patch: Partial<WorkoutExerciseCard>) => void;
  onOpenLessonPlayback?: () => void;
  lessonPlaybackAvailable?: boolean;
};

function renderStars(count: number): string {
  return "★".repeat(count);
}

export function ExerciseMediaTab({
  exercise,
  onUpdate,
  onOpenLessonPlayback,
  lessonPlaybackAvailable = false,
}: ExerciseMediaTabProps) {
  const [activeSceneId, setActiveSceneId] = useState("scene-goal");
  const [masterExpanded, setMasterExpanded] = useState(false);
  const [pipelineExpanded, setPipelineExpanded] = useState(false);
  const [briefSceneId, setBriefSceneId] = useState<string | null>(null);

  const isBenchPress = isBenchPressProductExercise(exercise.exerciseId);
  const approvedVideoAssetCount = isBenchPress
    ? countApprovedPlayableVideoAssets(exercise.exerciseId ?? "")
    : 0;

  const bundle = useMemo(
    () =>
      getExerciseMediaOsBundle({
        exerciseId: exercise.exerciseId,
        exerciseName: exercise.exerciseName,
        mediaComposer: exercise.mediaComposer,
      }),
    [exercise.exerciseId, exercise.exerciseName, exercise.mediaComposer],
  );

  const { mediaPackage, composer, timeline, readiness } = bundle;

  const focusCards = useMemo(
    () => buildFocusCardsForExercise(exercise.exerciseName, exercise.primaryMuscles),
    [exercise.exerciseName, exercise.primaryMuscles],
  );

  const selectedGoal = useMemo(
    () => resolveSelectedGoal(focusCards, composer.selectedTodayFocus),
    [composer.selectedTodayFocus, focusCards],
  );

  const narrativeScenes = useMemo(
    () =>
      buildLessonNarrativeScenes({
        goal: selectedGoal,
        timelineItems: timeline.items,
        activeSceneId,
      }),
    [activeSceneId, selectedGoal, timeline.items],
  );

  const timelineScenes = useMemo(
    () => narrativeScenes.filter((scene) => scene.sceneKey !== "goal"),
    [narrativeScenes],
  );

  const activeScene =
    narrativeScenes.find((scene) => scene.id === activeSceneId) ?? narrativeScenes[0];

  const activeSlot = useMemo(
    () =>
      activeScene?.sceneKey === "goal"
        ? undefined
        : resolveSlotForSceneKey(mediaPackage.slots, activeScene?.sceneKey ?? ""),
    [activeScene?.sceneKey, mediaPackage.slots],
  );

  const isCompletePackage = mediaPackage.status === "complete";
  const packageStatusLabel = isCompletePackage ? "Complete · Ready" : readinessLabel(readiness.score);

  const includedModules = useMemo(
    () => mediaPackage.slots.filter((slot) => composer.enabledSlots.includes(slot.slotType)),
    [composer.enabledSlots, mediaPackage.slots],
  );

  const stars = readinessStars(readiness.score);
  const coachMessageLength = composer.coachMessage.length;
  const activeSceneIndex = Math.max(
    0,
    narrativeScenes.findIndex((scene) => scene.id === activeScene?.id),
  );

  const updateComposer = (patch: Parameters<typeof applyMediaComposerPatch>[1]) => {
    onUpdate({
      mediaComposer: applyMediaComposerPatch(exercise.mediaComposer, patch),
    });
  };

  const selectGoal = (emphasis: VisualEmphasis) => {
    setActiveSceneId("scene-goal");
    updateComposer({ selectedTodayFocus: emphasis, selectedVisualEmphasis: emphasis });
  };

  const selectTeachingStyle = (style: TeachingStyle) => {
    updateComposer({ selectedTeachingStyle: style });
  };

  const selectDifficulty = (level: DifficultyLevel) => {
    updateComposer({ selectedDifficulty: level });
  };

  const selectScene = (sceneId: string) => {
    setActiveSceneId(sceneId);
  };

  const openSceneBrief = (sceneKey: string) => {
    setPipelineExpanded(true);
    setBriefSceneId(`bench-press-scene-${sceneKey}`);
  };

  const coachPreviewText =
    composer.coachMessage.trim() ||
    "Welcome to today's session — let's build confidence in every rep.";

  return (
    <TabPanelShell
      tab="media"
      icon="▶"
      panelTitle="Exercise Experience"
      panelSubtitle="Design how your client learns this movement."
    >
      <div className={styles.experienceRoot}>
        <div className={styles.experienceHeroRow}>
          <div className={styles.goalColumn}>
            <article className={styles.goalHero}>
              <div className={styles.goalHeroGlow} aria-hidden="true" />
              <div className={styles.goalHeroInner}>
                <span className={styles.goalKicker}>Today&apos;s Goal</span>
                <h2 className={styles.goalTitle}>{selectedGoal.title}</h2>
                <p className={styles.goalDescription}>{selectedGoal.description}</p>
                <p className={styles.goalMeta}>
                  ~{selectedGoal.estimatedMinutes} min focus · {teachingStyleLabel(composer.selectedTeachingStyle)}{" "}
                  tone · {composer.selectedDifficulty}
                </p>
              </div>
            </article>

            <div className={styles.goalPicker} role="group" aria-label="Lesson goal">
              {focusCards.map((card) => (
                <button
                  key={card.id}
                  type="button"
                  className={`${styles.goalOption} ${
                    composer.selectedTodayFocus === card.emphasis ? styles.goalOptionSelected : ""
                  }`}
                  aria-pressed={composer.selectedTodayFocus === card.emphasis}
                  onClick={() => {
                    selectGoal(card.emphasis);
                  }}
                >
                  {card.title}
                </button>
              ))}
            </div>

            <div className={styles.toneRow} role="group" aria-label="Teaching style">
              {TEACHING_STYLE_CARDS.map((card) => (
                <button
                  key={card.style}
                  type="button"
                  className={`${styles.toneChip} ${
                    composer.selectedTeachingStyle === card.style ? styles.toneChipSelected : ""
                  }`}
                  aria-pressed={composer.selectedTeachingStyle === card.style}
                  onClick={() => {
                    selectTeachingStyle(card.style);
                  }}
                >
                  {card.title}
                </button>
              ))}
            </div>

            <div className={styles.toneRow} role="group" aria-label="Client level">
              {DIFFICULTY_PILLS.map((pill) => (
                <button
                  key={pill.level}
                  type="button"
                  className={`${styles.toneChip} ${
                    composer.selectedDifficulty === pill.level ? styles.toneChipSelected : ""
                  }`}
                  aria-pressed={composer.selectedDifficulty === pill.level}
                  onClick={() => {
                    selectDifficulty(pill.level);
                  }}
                >
                  {pill.label}
                </button>
              ))}
            </div>
          </div>

          <aside className={styles.previewColumn}>
            <header className={styles.previewHeader}>
              <div>
                <span className={styles.previewKicker}>Client experience</span>
                <h3 className={styles.previewTitle}>This is what your client sees</h3>
              </div>
              <span className={styles.previewMeta}>
                {timeline.items.length} scenes · {formatLessonDuration(timeline.totalDurationSeconds)}
              </span>
            </header>

            {isBenchPress ? (
              <div className={styles.previewStatusRow}>
                <span className={styles.previewStatusBadge}>Blueprint Complete</span>
                <span className={styles.previewStatusReady}>Preview Available</span>
                <span className={styles.previewStatusPending}>
                  {approvedVideoAssetCount > 0
                    ? `${approvedVideoAssetCount} video assets approved`
                    : "Assets Pending Production"}
                </span>
              </div>
            ) : null}

            {isBenchPress ? (
              <p className={styles.assetDevNote}>
                To test real playback locally, add{" "}
                <code>public/media/exercises/bench_press/hero-demo.mp4</code> and mark the hero
                asset approved in the manifest.
              </p>
            ) : null}

            {lessonPlaybackAvailable ? (
              <button
                type="button"
                className={styles.previewLessonButton}
                onClick={onOpenLessonPlayback}
              >
                {isBenchPress ? "Preview Bench Press Lesson" : "Preview planned lesson"}
              </button>
            ) : (
              <p className={styles.previewUnavailable}>
                Preview available when Master Package is ready.
              </p>
            )}

            <div className={styles.deviceFrame}>
              <div className={styles.deviceNotch} aria-hidden="true" />
              <div key={activeScene?.id} className={styles.deviceScreen}>
                <span className={styles.deviceSceneBadge}>{activeScene?.title ?? "Goal"}</span>
                <button
                  type="button"
                  className={`${styles.deviceMedia} ${
                    activeSlot?.placeholderVisualLabel ? styles.deviceMediaRich : ""
                  } ${lessonPlaybackAvailable ? styles.deviceMediaInteractive : ""}`}
                  aria-label={
                    lessonPlaybackAvailable
                      ? "Open lesson playback preview"
                      : "Lesson preview placeholder"
                  }
                  disabled={!lessonPlaybackAvailable}
                  onClick={lessonPlaybackAvailable ? onOpenLessonPlayback : undefined}
                >
                  <span className={styles.devicePlay} aria-hidden="true">
                    ▶
                  </span>
                  {activeSlot?.placeholderVisualLabel ? (
                    <p className={styles.deviceMediaLabel}>{activeSlot.placeholderVisualLabel}</p>
                  ) : null}
                </button>
                <h4 className={styles.deviceExerciseName}>{exercise.exerciseName}</h4>
                <p className={styles.deviceSceneTitle}>{selectedGoal.title}</p>
                <p className={styles.devicePurpose}>{activeScene?.purpose}</p>
                <div className={styles.deviceProgress} aria-hidden="true">
                  {narrativeScenes.map((scene, index) => (
                    <div key={scene.id} className={styles.deviceProgressDot}>
                      <div
                        className={styles.deviceProgressFill}
                        style={{
                          width: index <= activeSceneIndex ? "100%" : "0%",
                        }}
                      />
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </aside>
        </div>

        <section className={styles.narrativeSection}>
          <header className={styles.sectionHeading}>
            <h6>Lesson Narrative</h6>
            <p>A flowing sequence — each scene builds the client&apos;s understanding.</p>
          </header>

          <div className={styles.narrativeFlow}>
            {narrativeScenes.map((scene, index) => {
              const isActive = scene.id === activeSceneId;
              const isLast = index === narrativeScenes.length - 1;

              return (
                <article key={scene.id} className={styles.narrativeScene}>
                  <div className={styles.narrativeConnector}>
                    <span
                      className={`${styles.narrativeDot} ${isActive ? styles.narrativeDotActive : ""}`}
                      aria-hidden="true"
                    >
                      {scene.icon}
                    </span>
                    {!isLast ? <span className={styles.narrativeLine} aria-hidden="true" /> : null}
                  </div>

                  <button
                    type="button"
                    className={`${styles.narrativeCard} ${isActive ? styles.narrativeCardActive : ""}`}
                    aria-pressed={isActive}
                    onClick={() => {
                      selectScene(scene.id);
                    }}
                  >
                    <div className={styles.narrativeCardTop}>
                      <strong>{scene.title}</strong>
                      {scene.durationSeconds ? (
                        <span>{formatExperienceDuration(scene.durationSeconds)}</span>
                      ) : null}
                    </div>
                    <p>{scene.purpose}</p>
                  </button>
                </article>
              );
            })}
          </div>
        </section>

        <section className={styles.coachIntroCard}>
          <header className={styles.sectionHeading}>
            <h6>Coach Introduction</h6>
            <p>Your voice opens the lesson — narration and video layers arrive soon.</p>
          </header>

          <div className={styles.coachIntroPreview}>
            {composer.coachMessage.trim() ? (
              <p className={styles.coachIntroQuote}>&ldquo;{coachPreviewText}&rdquo;</p>
            ) : (
              <p className={styles.coachIntroPlaceholder}>&ldquo;{coachPreviewText}&rdquo;</p>
            )}
          </div>

          <textarea
            className={styles.coachIntroInput}
            rows={3}
            maxLength={COACH_MESSAGE_MAX}
            value={composer.coachMessage}
            placeholder="Today we're prioritizing controlled tempo on every rep…"
            aria-label="Coach introduction message"
            onChange={(event) => {
              updateComposer({ coachMessage: event.target.value });
            }}
          />

          <div className={styles.coachIntroFooter}>
            <span className={styles.futureTag}>
              {coachMessageLength}/{COACH_MESSAGE_MAX}
            </span>
            <span className={styles.futureTag}>AI narration — coming soon</span>
            <span className={styles.futureTag}>Voice cloning — coming soon</span>
            <span className={styles.futureTag}>Coach video — coming soon</span>
          </div>
        </section>

        <section className={styles.narrativeSection}>
          <header className={styles.sectionHeading}>
            <h6>Lesson Timeline</h6>
            <p>Cinematic sequence — drag-free reordering reflects your directed lesson.</p>
          </header>

          <div className={styles.timelineScroll}>
            {timelineScenes.map((scene) => {
              const isActive = scene.id === activeSceneId;
              const slot = resolveSlotForSceneKey(mediaPackage.slots, scene.sceneKey);
              const isApproved = slot?.status === "approved";
              const slotAsset = slot ? getMediaAssetForSlot(exercise.exerciseId ?? "", slot.slotId) : undefined;
              const assetPlaybackLabel = slot
                ? mediaAssetPlaybackLabel(exercise.exerciseId ?? "", slot.slotId)
                : "Asset pending production";

              return (
                <button
                  key={scene.id}
                  type="button"
                  className={`${styles.timelineSceneCard} ${
                    isActive ? styles.timelineSceneCardActive : ""
                  }`}
                  aria-pressed={isActive}
                  onClick={() => {
                    selectScene(scene.id);
                  }}
                >
                  <div className={styles.timelineSceneThumbnail}>
                    <div className={styles.timelineSceneBadges}>
                      <span className={styles.mediaTypeBadge}>
                        {formatAssetKindLabel(slot?.assetKind)}
                      </span>
                      <span
                        className={
                          isApproved ? styles.mediaStatusBadge : styles.mediaStatusBadgePlanned
                        }
                      >
                        {formatSlotStatusLabel(slot?.status ?? "planned")}
                      </span>
                    </div>
                    <button
                      type="button"
                      className={styles.timelineScenePlayButton}
                      aria-label={`Preview ${scene.title}`}
                      disabled={!lessonPlaybackAvailable}
                      onClick={(event) => {
                        event.stopPropagation();
                        if (lessonPlaybackAvailable) {
                          onOpenLessonPlayback?.();
                        }
                      }}
                    >
                      <span className={styles.timelineScenePlay} aria-hidden="true">
                        ▶
                      </span>
                    </button>
                    {scene.durationSeconds ? (
                      <span className={styles.durationBadge}>
                        {formatExperienceDuration(scene.durationSeconds)}
                      </span>
                    ) : null}
                  </div>
                  <div className={styles.timelineSceneBody}>
                    {slot?.placeholderVisualLabel ? (
                      <span className={styles.timelineVisualLabel}>{slot.placeholderVisualLabel}</span>
                    ) : null}
                    <strong>{scene.title}</strong>
                    <p>{scene.purpose}</p>
                    <div className={styles.timelineSceneMeta}>
                      <span>{scene.source === "coach-custom" ? "Your Voice" : "Oli Master"}</span>
                      <span className={styles.previewStateReady}>
                        {isApproved ? "Blueprint ready" : "Planned"}
                      </span>
                    </div>
                    {isBenchPress && slot ? (
                      <div className={styles.timelineAssetMeta}>
                        <span>
                          Video Asset:{" "}
                          {slotAsset ? mediaAssetStatusLabel(slotAsset.status) : "Pending"}
                        </span>
                        <span>{assetPlaybackLabel}</span>
                      </div>
                    ) : null}
                    {isBenchPress ? (
                      <ProductionPipelineViewBriefButton
                        sceneId={`bench-press-scene-${scene.sceneKey}`}
                        onViewBrief={() => {
                          openSceneBrief(scene.sceneKey);
                        }}
                      />
                    ) : null}
                  </div>
                </button>
              );
            })}
          </div>
        </section>

        <section className={styles.masterCollapse}>
          <button
            type="button"
            className={styles.masterCollapseButton}
            aria-expanded={masterExpanded}
            onClick={() => {
              setMasterExpanded((value) => !value);
            }}
          >
            <div>
              {isCompletePackage ? (
                <span className={styles.masterPackageBadge}>Oli Master Media Package</span>
              ) : null}
              <h6 className={styles.masterCollapseTitle}>Master Lesson</h6>
              <p className={styles.masterCollapseMeta}>
                {includedModules.length} modules · {formatLessonDuration(mediaPackage.estimatedDurationSeconds)} ·{" "}
                <span className={isCompletePackage ? styles.masterCompleteLabel : undefined}>
                  {packageStatusLabel}
                </span>
              </p>
            </div>
            <span className={styles.masterStars} aria-label={`${stars} out of 5 stars`}>
              {renderStars(stars)}
            </span>
          </button>

          {masterExpanded ? (
            <div className={styles.masterCollapseBody}>
              <p className={styles.masterCollapseMeta}>
                Oli&apos;s complete lesson package powers your experience — expand only when you need the details.
              </p>
              <div className={styles.masterModuleGrid}>
                {includedModules.map((slot) => (
                  <div key={slot.slotId} className={styles.masterModule}>
                    <span aria-hidden="true">{getModuleIcon(slot.slotType)} </span>
                    {slot.title}
                    {slot.status === "approved" ? (
                      <span className={styles.mediaStatusBadge}>Ready</span>
                    ) : null}
                  </div>
                ))}
              </div>
            </div>
          ) : null}
        </section>

        {isBenchPress ? (
          <ProductionPipelineSection
            expanded={pipelineExpanded}
            onToggleExpanded={() => {
              setPipelineExpanded((value) => !value);
            }}
            briefSceneId={briefSceneId}
            onViewBrief={setBriefSceneId}
          />
        ) : null}

        <section className={styles.narrativeSection}>
          <header className={styles.sectionHeading}>
            <h6>Future Capabilities</h6>
            <p>What&apos;s next on the experience roadmap.</p>
          </header>

          <div className={styles.roadmapGrid}>
            {EXPERIENCE_ROADMAP_CARDS.map((card) => (
              <article key={card.id} className={styles.roadmapCard}>
                <div className={styles.roadmapCardTop}>
                  <span className={styles.roadmapIcon} aria-hidden="true">
                    {card.icon}
                  </span>
                  <span className={styles.comingSoon}>Coming soon</span>
                </div>
                <strong>{card.title}</strong>
                <p>{card.description}</p>
              </article>
            ))}
          </div>
        </section>
      </div>
    </TabPanelShell>
  );
}
