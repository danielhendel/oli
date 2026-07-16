/**
 * Pure day → Timeline presentation items normalizer.
 * No Firestore, no network. Deterministic for a given input snapshot.
 */

import {
  manualNutritionPayloadSchema,
  type CanonicalEventListItem,
  type DailyFactsDto,
  type InsightDto,
  type RawEventListItem,
  type SleepNightViewDto,
  type TimelinePresentationItem,
  type TimelinePresentationSource,
} from "@oli/contracts";

import { dedupeTimelineFeedItems } from "./dedupe";
import { sortTimelineFeedItems } from "./order";

const CAFFEINE_RE =
  /\b(coffee|espresso|latte|cappuccino|americano|macchiato|caffeine|cold brew)\b/i;

export type NormalizeTimelineDayInput = {
  day: string;
  timezone?: string;
  /** Device/server notion of "today" for live marker emission. */
  todayDay: string;
  /** ISO now used for live marker position when day === todayDay. */
  nowIso: string;
  events?: readonly CanonicalEventListItem[];
  rawItems?: readonly RawEventListItem[];
  sleepNight?: SleepNightViewDto | null;
  /**
   * Extra nights whose `startedAt` may fall on this day (e.g. next wake-day night).
   * Used only for bedtime emission; sleep context still uses `sleepNight`.
   */
  bedtimeNights?: readonly SleepNightViewDto[];
  /** Exact-day readiness only — never prior-day fallback labeled as current. */
  readiness?:
    | {
        score?: number | null | undefined;
        connected: boolean;
      }
    | null;
  dailyFacts?: DailyFactsDto | null;
  insights?: readonly InsightDto[];
};

function formatDurationMinutes(minutes: number): string {
  const total = Math.max(0, Math.round(minutes));
  const h = Math.floor(total / 60);
  const m = total % 60;
  if (h > 0 && m > 0) return `${h}h ${m}m`;
  if (h > 0) return `${h}h`;
  return `${m}m`;
}

function mapProvenance(raw?: string): TimelinePresentationSource {
  switch (raw) {
    case "manual":
    case "device":
    case "upload":
    case "backfill":
    case "correction":
      return raw;
    default:
      return "unknown";
  }
}

function accessibilityLabelFor(title: string, summary?: string): string {
  return [title, summary].filter((s): s is string => !!s && s.length > 0).join(", ");
}

function dayStartIso(day: string): string {
  return `${day}T00:00:00.000Z`;
}

function dayEndIso(day: string): string {
  return `${day}T23:59:00.000Z`;
}

function buildSleepContext(
  day: string,
  timezone: string,
  sleepNight: SleepNightViewDto | null | undefined,
): TimelinePresentationItem {
  const night = sleepNight?.sleepNight;
  const score = night?.score;
  const minutes = night?.totalSleepMinutes ?? night?.mainSleepMinutes;
  const hasData = !!night && (typeof score === "number" || typeof minutes === "number");
  const summaryParts: string[] = [];
  if (typeof score === "number" && Number.isFinite(score)) {
    summaryParts.push(`Score ${Math.round(score)}`);
  }
  if (typeof minutes === "number" && Number.isFinite(minutes)) {
    summaryParts.push(formatDurationMinutes(minutes));
  }
  const summary = summaryParts.length > 0 ? summaryParts.join(" · ") : undefined;
  const occurredAt =
    night?.endedAt && Number.isFinite(Date.parse(night.endedAt))
      ? night.endedAt
      : dayStartIso(day);

  return {
    id: `sleep_context:${day}`,
    kind: "sleep_context",
    day,
    occurredAt,
    timezone,
    title: "Sleep",
    ...(summary ? { summary } : {}),
    status: hasData ? "ready" : "missing",
    source: night?.provider === "oura" ? "oura" : hasData ? "derived" : "unknown",
    destination: `/(app)/recovery/sleep?day=${day}`,
    accessibilityLabel: accessibilityLabelFor("Sleep", summary ?? "No sleep data"),
    dedupeKey: `sleep_context:${day}`,
    isSynthetic: true,
    displayRole: "day_context",
  };
}

function buildRecoveryContext(
  day: string,
  timezone: string,
  readiness: NormalizeTimelineDayInput["readiness"],
): TimelinePresentationItem {
  const connected = readiness?.connected === true;
  const score = readiness?.score;
  const hasScore = typeof score === "number" && Number.isFinite(score);
  let status: TimelinePresentationItem["status"] = "missing";
  if (!connected) status = "disconnected";
  else if (hasScore) status = "ready";
  else status = "missing";

  const summary = hasScore ? `Score ${Math.round(score as number)}` : undefined;

  return {
    id: `recovery_context:${day}`,
    kind: "recovery_context",
    day,
    occurredAt: dayStartIso(day),
    timezone,
    title: "Recovery",
    ...(summary ? { summary } : {}),
    status,
    source: connected ? "oura" : "unknown",
    destination: "/(app)/recovery/readiness",
    accessibilityLabel: accessibilityLabelFor(
      "Recovery",
      summary ?? (connected ? "No readiness data" : "Readiness disconnected"),
    ),
    dedupeKey: `recovery_context:${day}`,
    isSynthetic: true,
    displayRole: "day_context",
  };
}

function buildBedtime(
  day: string,
  timezone: string,
  candidates: readonly (SleepNightViewDto | null | undefined)[],
): TimelinePresentationItem | null {
  for (const view of candidates) {
    const night = view?.sleepNight;
    const startedAt = night?.startedAt;
    if (!startedAt || !Number.isFinite(Date.parse(startedAt))) continue;
    const startDay = startedAt.slice(0, 10);
    if (startDay !== day) continue;
    const anchor = night?.anchorDay ?? day;
    return {
      id: `sleep_start:${anchor}`,
      kind: "sleep_start",
      day,
      occurredAt: startedAt,
      timezone,
      title: "Went to sleep",
      status: "ready",
      source: night?.provider === "oura" ? "oura" : "derived",
      destination: `/(app)/recovery/sleep?day=${night?.wakeDay ?? day}`,
      accessibilityLabel: "Went to sleep",
      dedupeKey: `sleep_start:${anchor}`,
      isSynthetic: false,
      displayRole: "chronological_event",
    };
  }
  return null;
}

function buildWake(
  day: string,
  timezone: string,
  sleepNight: SleepNightViewDto | null | undefined,
): TimelinePresentationItem | null {
  const night = sleepNight?.sleepNight;
  const endedAt = night?.endedAt;
  if (!endedAt || !Number.isFinite(Date.parse(endedAt))) return null;
  const minutes = night?.totalSleepMinutes ?? night?.mainSleepMinutes;
  const summary =
    typeof minutes === "number" && Number.isFinite(minutes)
      ? `${formatDurationMinutes(minutes)} sleep`
      : undefined;

  return {
    id: `sleep_wake:${day}`,
    kind: "sleep_wake",
    day,
    occurredAt: endedAt,
    timezone,
    title: "Woke up",
    ...(summary ? { summary } : {}),
    status: "ready",
    source: night?.provider === "oura" ? "oura" : "derived",
    ...(night?.provider ? { provenance: night.provider } : {}),
    destination: `/(app)/recovery/sleep?day=${day}`,
    accessibilityLabel: accessibilityLabelFor("Woke up", summary),
    dedupeKey: `sleep_wake:${day}`,
    isSynthetic: false,
    displayRole: "chronological_event",
  };
}

function buildNutritionItems(
  day: string,
  timezone: string,
  rawItems: readonly RawEventListItem[],
): TimelinePresentationItem[] {
  const out: TimelinePresentationItem[] = [];
  for (const r of rawItems) {
    if (r.kind !== "nutrition" || r.payload == null) continue;
    const parsed = manualNutritionPayloadSchema.safeParse(r.payload);
    if (!parsed.success) continue;
    if (!Number.isFinite(Date.parse(r.observedAt))) continue;
    const pl = parsed.data;
    const food = pl.foodLabel?.trim();
    const isCaffeine = !!food && CAFFEINE_RE.test(food);
    const title =
      food && food.length > 0
        ? food
        : pl.logScope === "day_aggregate"
          ? "Quick add"
          : "Nutrition";
    const summary = `${Math.round(pl.totalKcal)} kcal`;
    out.push({
      id: r.id,
      kind: isCaffeine ? "caffeine" : "nutrition",
      day,
      occurredAt: r.observedAt,
      timezone,
      title,
      summary,
      status: "ready",
      source: mapProvenance(r.provenance),
      ...(r.provenance ? { provenance: r.provenance } : {}),
      destination: `/(app)/nutrition/day/${day}`,
      accessibilityLabel: accessibilityLabelFor(title, summary),
      dedupeKey: `nutrition:${r.id}`,
      isSynthetic: false,
      displayRole: "chronological_event",
    });
  }
  return out;
}

function buildIncompleteItems(
  day: string,
  timezone: string,
  rawItems: readonly RawEventListItem[],
): TimelinePresentationItem[] {
  const out: TimelinePresentationItem[] = [];
  for (const r of rawItems) {
    if (r.kind !== "incomplete") continue;
    if (!Number.isFinite(Date.parse(r.observedAt))) continue;
    out.push({
      id: r.id,
      kind: "incomplete",
      day,
      occurredAt: r.observedAt,
      timezone,
      title: "Something happened",
      summary: "Tap to add details",
      status: "incomplete",
      source: mapProvenance(r.provenance),
      ...(r.provenance ? { provenance: r.provenance } : {}),
      destination: `/(app)/(tabs)/timeline/${day}`,
      accessibilityLabel: "Something happened, Tap to add details",
      dedupeKey: `incomplete:${r.id}`,
      isSynthetic: false,
      displayRole: "chronological_event",
    });
  }
  return out;
}

const CANONICAL_KIND_MAP: Record<
  string,
  { kind: TimelinePresentationItem["kind"]; title: string; destination: (day: string) => string } | undefined
> = {
  strength_workout: {
    kind: "workout_strength",
    title: "Strength workout",
    destination: (d) => `/(app)/workouts/day/${d}`,
  },
  workout: {
    kind: "workout",
    title: "Workout",
    destination: (d) => `/(app)/workouts/day/${d}`,
  },
  weight: {
    kind: "weight",
    title: "Weight",
    destination: (d) => `/(app)/body/day/${d}`,
  },
};

function buildCanonicalItems(
  day: string,
  timezone: string,
  events: readonly CanonicalEventListItem[],
  skipSleep: boolean,
): TimelinePresentationItem[] {
  const out: TimelinePresentationItem[] = [];
  for (const ev of events) {
    if (ev.kind === "nutrition") continue;
    if (ev.kind === "steps") continue; // forbid midnight Steps fabrication
    if (ev.kind === "sleep" && skipSleep) continue;
    if (ev.kind === "hrv") continue; // recovery context covers readiness
    const map = CANONICAL_KIND_MAP[ev.kind];
    if (!map) continue;
    if (!Number.isFinite(Date.parse(ev.start))) continue;
    out.push({
      id: ev.id,
      kind: map.kind,
      day,
      occurredAt: ev.start,
      timezone: ev.timezone || timezone,
      title: map.title,
      status: "ready",
      source: ev.sourceId === "manual" ? "manual" : "device",
      destination: map.destination(day),
      accessibilityLabel: map.title,
      dedupeKey: `canonical:${ev.id}`,
      isSynthetic: false,
      displayRole: "chronological_event",
    });
  }
  return out;
}

function buildInsightItems(
  day: string,
  timezone: string,
  insights: readonly InsightDto[],
): TimelinePresentationItem[] {
  const out: TimelinePresentationItem[] = [];
  for (const ins of insights) {
    if (!Number.isFinite(Date.parse(ins.createdAt))) continue;
    out.push({
      id: `insight:${ins.id}`,
      kind: "insight",
      day,
      occurredAt: ins.createdAt,
      timezone,
      title: ins.title,
      ...(ins.message ? { summary: ins.message } : {}),
      status: "ready",
      source: "derived",
      destination: "/(app)/dash/daily-recap",
      accessibilityLabel: accessibilityLabelFor(ins.title, ins.message),
      dedupeKey: `insight:${ins.id}`,
      isSynthetic: false,
      displayRole: "chronological_event",
    });
  }
  return out;
}

function buildActivityLive(
  day: string,
  timezone: string,
  todayDay: string,
  nowIso: string,
  dailyFacts: DailyFactsDto | null | undefined,
): TimelinePresentationItem | null {
  if (day !== todayDay) return null;
  if (!Number.isFinite(Date.parse(nowIso))) return null;
  const steps = dailyFacts?.activity?.steps;
  const summary =
    typeof steps === "number" && Number.isFinite(steps) ? `${Math.round(steps)} steps so far` : undefined;
  return {
    id: `activity_live:${day}`,
    kind: "activity_live",
    day,
    occurredAt: nowIso,
    timezone,
    title: "Activity so far",
    ...(summary ? { summary } : {}),
    status: typeof steps === "number" ? "ready" : "partial",
    source: "synthetic",
    destination: `/(app)/activity/day/${day}`,
    accessibilityLabel: accessibilityLabelFor("Activity so far", summary),
    dedupeKey: `activity_live:${day}`,
    isSynthetic: true,
    displayRole: "live_marker",
  };
}

function buildActivityFinal(
  day: string,
  timezone: string,
  todayDay: string,
  dailyFacts: DailyFactsDto | null | undefined,
): TimelinePresentationItem | null {
  if (day === todayDay) return null; // live marker covers today
  const steps = dailyFacts?.activity?.steps;
  if (typeof steps !== "number" || !Number.isFinite(steps)) return null;
  const summary = `${Math.round(steps)} steps`;
  return {
    id: `activity_final:${day}`,
    kind: "activity_final",
    day,
    occurredAt: dayEndIso(day),
    timezone,
    title: "Activity",
    summary,
    status: "ready",
    source: "derived",
    destination: `/(app)/activity/day/${day}`,
    accessibilityLabel: accessibilityLabelFor("Activity", summary),
    dedupeKey: `activity_final:${day}`,
    isSynthetic: true,
    displayRole: "chronological_event",
  };
}

/**
 * Normalize one calendar day's trusted read models into presentation items.
 * Order: sleep context → recovery context → chronological (incl. bedtime) + live marker.
 */
export function normalizeTimelineDay(input: NormalizeTimelineDayInput): TimelinePresentationItem[] {
  const day = input.day;
  const timezone = input.timezone ?? "UTC";
  const events = input.events ?? [];
  const rawItems = input.rawItems ?? [];
  const insights = input.insights ?? [];

  const wake = buildWake(day, timezone, input.sleepNight);
  const bedtime = buildBedtime(day, timezone, [
    input.sleepNight,
    ...(input.bedtimeNights ?? []),
  ]);

  const merged: TimelinePresentationItem[] = [
    buildSleepContext(day, timezone, input.sleepNight),
    buildRecoveryContext(day, timezone, input.readiness),
    ...(bedtime ? [bedtime] : []),
    ...(wake ? [wake] : []),
    ...buildNutritionItems(day, timezone, rawItems),
    ...buildIncompleteItems(day, timezone, rawItems),
    ...buildCanonicalItems(day, timezone, events, wake != null),
    ...buildInsightItems(day, timezone, insights),
  ];

  const live = buildActivityLive(day, timezone, input.todayDay, input.nowIso, input.dailyFacts);
  if (live) merged.push(live);
  const activityFinal = buildActivityFinal(day, timezone, input.todayDay, input.dailyFacts);
  if (activityFinal) merged.push(activityFinal);

  return sortTimelineFeedItems(dedupeTimelineFeedItems(merged));
}
