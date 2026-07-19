// lib/features/timeline/buildTimelineDayVm.ts
// Pure builder: server truths for one day → chronological TimelineDayVm.
// No hooks, no Firebase, no network. Deterministic ordering for virtualization.

import {
  manualNutritionPayloadSchema,
  type CanonicalEventListItem,
  type DailyFactsDto,
  type InsightDto,
  type RawEventListItem,
  type ReadinessViewDto,
  type SleepNightViewDto,
} from "@oli/contracts";
import { normalizeOuraScore0to100 } from "@/lib/format/ouraScore";
import { isDailyTimelineAggregateAction } from "@/lib/features/timeline/isDailyTimelineAggregateAction";
import { buildReconciledDailyTimelineWorkoutItems } from "@/lib/features/timeline/reconcileDailyTimelineWorkoutActions";
import { resolveTimelineItemHref } from "@/lib/features/timeline/resolveTimelineItemHref";
import type {
  TimelineDayContextRow,
  TimelineDayItem,
  TimelineDaySummary,
  TimelineDayVm,
  TimelineSourceType,
} from "@/lib/features/timeline/types";

export type BuildTimelineDayVmInput = {
  day: string;
  events?: readonly CanonicalEventListItem[];
  rawItems?: readonly RawEventListItem[];
  sleepNight?: SleepNightViewDto | null;
  dailyFacts?: DailyFactsDto | null;
  /** Exact-day readiness view; proxy HRV/RHR must never substitute for the score. */
  readinessView?: ReadinessViewDto | null;
  insights?: readonly InsightDto[];
};

export { isDailyTimelineAggregateAction } from "@/lib/features/timeline/isDailyTimelineAggregateAction";

const ICONS: Record<TimelineSourceType, string> = {
  sleep_wake: "sunny-outline",
  sleep: "moon-outline",
  nutrition: "restaurant-outline",
  supplement: "medical-outline",
  caffeine: "cafe-outline",
  workout_strength: "barbell-outline",
  workout_cardio: "bicycle-outline",
  workout: "fitness-outline",
  steps: "walk-outline",
  activity: "walk-outline",
  weight: "body-outline",
  body_composition: "body-outline",
  recovery: "heart-outline",
  readiness: "heart-outline",
  hrv: "pulse-outline",
  lab: "flask-outline",
  upload: "cloud-upload-outline",
  insight: "bulb-outline",
  manual_note: "create-outline",
  incomplete: "create-outline",
  unknown: "ellipse-outline",
};

const CAFFEINE_RE = /\b(coffee|espresso|latte|cappuccino|americano|macchiato|caffeine|cold brew)\b/i;

/** Canonical event kinds → display defaults. Nutrition is intentionally omitted (raw events win). */
const CANONICAL_KIND_MAP: Record<
  string,
  { sourceType: TimelineSourceType; title: string } | undefined
> = {
  strength_workout: { sourceType: "workout_strength", title: "Strength workout" },
  workout: { sourceType: "workout", title: "Workout" },
  steps: { sourceType: "steps", title: "Steps" },
  weight: { sourceType: "weight", title: "Weight" },
  hrv: { sourceType: "hrv", title: "HRV" },
  sleep: { sourceType: "sleep", title: "Sleep" },
};

function formatDurationMinutes(minutes: number): string {
  const total = Math.max(0, Math.round(minutes));
  const h = Math.floor(total / 60);
  const m = total % 60;
  if (h > 0 && m > 0) return `${h}h ${m}m`;
  if (h > 0) return `${h}h`;
  return `${m}m`;
}

import { formatMealSlotDisplayLabel } from "@/lib/nutrition/mealSlot";

function accessibilityLabelFor(title: string, subtitle?: string): string {
  return [title, subtitle].filter((s): s is string => !!s && s.length > 0).join(", ");
}

function buildItem(args: {
  id: string;
  day: string;
  timestamp: string;
  title: string;
  subtitle?: string;
  sourceType: TimelineSourceType;
  sourceId: string;
  isPassive: boolean;
  canonicalEventId?: string;
  provenance?: string;
}): TimelineDayItem {
  const { id, day, timestamp, title, subtitle, sourceType, sourceId, isPassive } = args;
  const href = resolveTimelineItemHref({
    sourceType,
    day,
    ...(args.canonicalEventId ? { canonicalEventId: args.canonicalEventId } : {}),
  });
  return {
    id,
    day,
    timestamp,
    sortKey: `${timestamp}#${id}`,
    title,
    ...(subtitle ? { subtitle } : {}),
    sourceType,
    sourceId,
    icon: ICONS[sourceType],
    href,
    isPassive,
    accessibilityLabel: accessibilityLabelFor(title, subtitle),
    ...(args.provenance ? { provenance: args.provenance } : {}),
  };
}

function buildNutritionItems(
  day: string,
  rawItems: readonly RawEventListItem[],
): TimelineDayItem[] {
  const out: TimelineDayItem[] = [];
  for (const r of rawItems) {
    if (r.kind !== "nutrition" || r.payload == null) continue;
    const parsed = manualNutritionPayloadSchema.safeParse(r.payload);
    if (!parsed.success) continue;
    const pl = parsed.data;
    if (!Number.isFinite(Date.parse(r.observedAt))) continue;

    const food = pl.foodLabel?.trim();
    const isCaffeine = !!food && CAFFEINE_RE.test(food);
    const title =
      food && food.length > 0
        ? food
        : pl.logScope === "day_aggregate"
          ? "Quick add"
          : formatMealSlotDisplayLabel(pl.mealSlot) || "Nutrition";

    const subtitleParts = [
      formatMealSlotDisplayLabel(pl.mealSlot),
      `${Math.round(pl.totalKcal)} kcal`,
    ].filter((s) => s.length > 0);

    out.push(
      buildItem({
        id: r.id,
        day,
        timestamp: r.observedAt,
        title,
        subtitle: subtitleParts.join(" · "),
        sourceType: isCaffeine ? "caffeine" : "nutrition",
        sourceId: r.id,
        isPassive: false,
        ...(r.provenance ? { provenance: r.provenance } : {}),
      }),
    );
  }
  return out;
}

function buildIncompleteItems(
  day: string,
  rawItems: readonly RawEventListItem[],
): TimelineDayItem[] {
  const out: TimelineDayItem[] = [];
  for (const r of rawItems) {
    if (r.kind !== "incomplete") continue;
    if (!Number.isFinite(Date.parse(r.observedAt))) continue;
    out.push(
      buildItem({
        id: r.id,
        day,
        timestamp: r.observedAt,
        title: "Something happened",
        subtitle: "Tap to add details",
        sourceType: "incomplete",
        sourceId: r.id,
        isPassive: false,
        ...(r.provenance ? { provenance: r.provenance } : {}),
      }),
    );
  }
  return out;
}

function buildWakeItem(day: string, sleepNight: SleepNightViewDto | null | undefined): TimelineDayItem | null {
  if (!sleepNight) return null;
  const night = sleepNight.sleepNight;
  const endedAt = night.endedAt;
  if (!endedAt || !Number.isFinite(Date.parse(endedAt))) return null;

  const minutes = night.totalSleepMinutes ?? night.mainSleepMinutes;
  const subtitle =
    typeof minutes === "number" && Number.isFinite(minutes)
      ? `${formatDurationMinutes(minutes)} sleep`
      : undefined;

  return buildItem({
    id: `sleep_wake:${day}`,
    day,
    timestamp: endedAt,
    title: "Woke up",
    ...(subtitle ? { subtitle } : {}),
    sourceType: "sleep_wake",
    sourceId: `sleep_wake:${day}`,
    isPassive: true,
    provenance: night.provider,
  });
}

function buildCanonicalItems(
  day: string,
  events: readonly CanonicalEventListItem[],
  skipSleep: boolean,
): TimelineDayItem[] {
  const out: TimelineDayItem[] = [];
  for (const ev of events) {
    if (ev.kind === "nutrition") continue; // raw nutrition events are the source of truth for meals
    if (ev.kind === "sleep" && skipSleep) continue;
    // Aggregates belong in Daily context only — never as chronological actions.
    if (isDailyTimelineAggregateAction({ kind: ev.kind })) continue;
    // Workouts are emitted once via shared session reconciliation.
    if (ev.kind === "workout" || ev.kind === "strength_workout") continue;
    const map = CANONICAL_KIND_MAP[ev.kind];
    const meta = map ?? { sourceType: "unknown" as const, title: ev.kind };
    if (!Number.isFinite(Date.parse(ev.start))) continue;
    out.push(
      buildItem({
        id: ev.id,
        day,
        timestamp: ev.start,
        title: meta.title,
        sourceType: meta.sourceType,
        sourceId: ev.sourceId,
        canonicalEventId: ev.id,
        isPassive: ev.sourceId !== "manual",
      }),
    );
  }
  return out;
}

function buildInsightItems(day: string, insights: readonly InsightDto[]): TimelineDayItem[] {
  const out: TimelineDayItem[] = [];
  for (const ins of insights) {
    if (!Number.isFinite(Date.parse(ins.createdAt))) continue;
    out.push(
      buildItem({
        id: `insight:${ins.id}`,
        day,
        timestamp: ins.createdAt,
        title: ins.title,
        subtitle: ins.message,
        sourceType: "insight",
        sourceId: ins.id,
        isPassive: true,
      }),
    );
  }
  return out;
}


function formatDurationMinutesLabel(minutes: number): string {
  const total = Math.max(0, Math.round(minutes));
  const h = Math.floor(total / 60);
  const m = total % 60;
  if (h > 0 && m > 0) return `${h}h ${m}m`;
  if (h > 0) return `${h}h`;
  return `${m}m`;
}

/**
 * Legacy midnight Steps detector. Daily Timeline now excludes all aggregate Steps
 * via {@link isDailyTimelineAggregateAction}; this remains for focused regression tests.
 */
export function isMidnightFabricatedStepsItem(item: TimelineDayItem): boolean {
  if (!isDailyTimelineAggregateAction(item)) return false;
  const ms = Date.parse(item.timestamp);
  if (!Number.isFinite(ms)) return false;
  const d = new Date(ms);
  return d.getUTCHours() === 0 && d.getUTCMinutes() === 0 && d.getUTCSeconds() === 0;
}

function exactDayReadinessScore(
  day: string,
  readinessView: ReadinessViewDto | null | undefined,
): number | null {
  if (!readinessView) return null;
  if (readinessView.isFallback === true) return null;
  if (readinessView.requestedDay !== day || readinessView.resolvedDay !== day) return null;
  return normalizeOuraScore0to100(readinessView.score);
}

export function buildDailyTimelineContext(input: {
  day: string;
  sleepNight?: SleepNightViewDto | null;
  dailyFacts?: DailyFactsDto | null;
  readinessView?: ReadinessViewDto | null;
}): TimelineDayContextRow[] {
  const { day } = input;
  const night = input.sleepNight?.sleepNight;
  const facts = input.dailyFacts;

  const sleepMinutes =
    (typeof night?.totalSleepMinutes === "number" ? night.totalSleepMinutes : undefined) ??
    (typeof night?.mainSleepMinutes === "number" ? night.mainSleepMinutes : undefined) ??
    (typeof facts?.sleep?.totalMinutes === "number" ? facts.sleep.totalMinutes : undefined);
  const sleepScore = typeof night?.score === "number" ? night.score : undefined;
  let sleepValue: string | undefined;
  if (typeof sleepScore === "number" && Number.isFinite(sleepScore)) {
    sleepValue = `Score ${Math.round(sleepScore)}`;
    if (typeof sleepMinutes === "number") {
      sleepValue = `${sleepValue} · ${formatDurationMinutesLabel(sleepMinutes)}`;
    }
  } else if (typeof sleepMinutes === "number") {
    sleepValue = formatDurationMinutesLabel(sleepMinutes);
  }
  const sleepAvailable = sleepValue != null;
  const sleep: TimelineDayContextRow = {
    kind: "sleep",
    title: "Sleep",
    ...(sleepValue ? { valueLabel: sleepValue } : {}),
    availability: sleepAvailable ? "available" : "unavailable",
    accessibilityLabel: sleepAvailable
      ? `Sleep, ${sleepValue}`
      : "Sleep, unavailable",
    href: `/(app)/recovery/sleep?day=${day}`,
    icon: "moon-outline",
  };

  // Recovery contract: exact-day readiness score, otherwise unavailable.
  // Never substitute HRV / RHR / contributors for the score in context.
  const recoveryScore = exactDayReadinessScore(day, input.readinessView);
  const recoveryValue =
    recoveryScore != null ? `Score ${recoveryScore}` : undefined;
  const recoveryAvailable = recoveryValue != null;
  const recovery: TimelineDayContextRow = {
    kind: "recovery",
    title: "Recovery",
    ...(recoveryValue ? { valueLabel: recoveryValue } : {}),
    availability: recoveryAvailable ? "available" : "unavailable",
    accessibilityLabel: recoveryAvailable
      ? `Recovery, ${recoveryValue}`
      : "Recovery, unavailable",
    href: "/(app)/recovery/readiness",
    icon: "heart-outline",
  };

  const steps = typeof facts?.activity?.steps === "number" ? facts.activity.steps : undefined;
  const activityValue =
    typeof steps === "number" && Number.isFinite(steps)
      ? `${Math.round(steps).toLocaleString("en-US")} steps`
      : undefined;
  const activityAvailable = activityValue != null;
  const activity: TimelineDayContextRow = {
    kind: "activity",
    title: "Activity",
    ...(activityValue ? { valueLabel: activityValue } : {}),
    availability: activityAvailable ? "available" : "unavailable",
    accessibilityLabel: activityAvailable
      ? `Activity, ${activityValue}`
      : "Activity, unavailable",
    href: `/(app)/activity/day/${day}`,
    icon: "walk-outline",
  };

  return [sleep, recovery, activity];
}


function buildSummary(dailyFacts: DailyFactsDto | null | undefined): TimelineDaySummary | null {
  if (!dailyFacts) return null;
  const summary: TimelineDaySummary = {};
  if (typeof dailyFacts.activity?.steps === "number") summary.steps = dailyFacts.activity.steps;
  if (typeof dailyFacts.nutrition?.totalKcal === "number") summary.totalKcal = dailyFacts.nutrition.totalKcal;
  if (typeof dailyFacts.sleep?.totalMinutes === "number") summary.sleepMinutes = dailyFacts.sleep.totalMinutes;
  return Object.keys(summary).length > 0 ? summary : null;
}

/** Stable chronological sort: ascending timestamp, then id tie-break. Invalid times sink to the end. */
function sortItems(items: TimelineDayItem[]): TimelineDayItem[] {
  return [...items].sort((a, b) => {
    const ta = Date.parse(a.timestamp);
    const tb = Date.parse(b.timestamp);
    const va = Number.isFinite(ta) ? ta : Number.POSITIVE_INFINITY;
    const vb = Number.isFinite(tb) ? tb : Number.POSITIVE_INFINITY;
    if (va !== vb) return va - vb;
    return a.id < b.id ? -1 : a.id > b.id ? 1 : 0;
  });
}

/**
 * Build a single day's timeline view model from already-fetched server truths.
 * Each input is optional so the screen can render from whatever ready sources exist
 * (one optional source failing must not blank the whole day).
 */
export function buildTimelineDayVm(input: BuildTimelineDayVmInput): TimelineDayVm {
  const { day } = input;
  const events = input.events ?? [];
  const rawItems = input.rawItems ?? [];
  const insights = input.insights ?? [];

  const wake = buildWakeItem(day, input.sleepNight);

  const merged: TimelineDayItem[] = [
    ...buildNutritionItems(day, rawItems),
    ...buildIncompleteItems(day, rawItems),
    ...buildCanonicalItems(day, events, wake != null),
    ...buildReconciledDailyTimelineWorkoutItems(day, events),
    ...buildInsightItems(day, insights),
  ];
  if (wake) merged.push(wake);

  const items = sortItems(merged).filter((item) => !isDailyTimelineAggregateAction(item));
  const context = buildDailyTimelineContext({
    day,
    ...(input.sleepNight !== undefined ? { sleepNight: input.sleepNight } : {}),
    ...(input.dailyFacts !== undefined ? { dailyFacts: input.dailyFacts } : {}),
    ...(input.readinessView !== undefined ? { readinessView: input.readinessView } : {}),
  });

  return {
    day,
    context,
    items,
    isEmpty: items.length === 0,
    summary: buildSummary(input.dailyFacts),
  };
}
