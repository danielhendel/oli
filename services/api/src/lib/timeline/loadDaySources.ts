/**
 * Load trusted read models for one Timeline feed day (no provider calls / writes).
 */

import {
  canonicalEventListItemSchema,
  dailyFactsDtoSchema,
  insightDtoSchema,
  rawEventListItemSchema,
  type CanonicalEventListItem,
  type DailyFactsDto,
  type InsightDto,
  type RawEventListItem,
  type SleepNightViewDto,
} from "@oli/contracts";

import { userCollection } from "../../db";
import { loadSleepNightView } from "../sleepNightRead";
import { dayMinusUtc } from "./order";
import type { NormalizeTimelineDayInput } from "./normalizeDay";

type TimestampLike = { toDate: () => Date };

function isTimestampLike(v: unknown): v is TimestampLike {
  return v != null && typeof v === "object" && typeof (v as TimestampLike).toDate === "function";
}

function toIsoFromTimestampLike(v: unknown): string | null {
  if (!v) return null;
  if (typeof v === "string") return v;
  if (isTimestampLike(v)) return v.toDate().toISOString();
  return null;
}

export type TimelineDaySources = {
  day: string;
  events: CanonicalEventListItem[];
  rawItems: RawEventListItem[];
  sleepNight: SleepNightViewDto | null;
  bedtimeNights: SleepNightViewDto[];
  readiness: NormalizeTimelineDayInput["readiness"];
  dailyFacts: DailyFactsDto | null;
  insights: InsightDto[];
};

/** Exact-day readiness only — no prior-day fallback labeled as current. */
async function loadExactDayReadiness(
  uid: string,
  day: string,
): Promise<NormalizeTimelineDayInput["readiness"]> {
  const snap = await userCollection(uid, "ouraVendorReadiness").where("day", "==", day).limit(1).get();
  if (snap.empty) {
    // Exact-day miss is honest no-data (missing), not provider disconnected.
    return { connected: true, score: null };
  }
  const data = snap.docs[0]?.data() as { score?: unknown } | undefined;
  const score = typeof data?.score === "number" && Number.isFinite(data.score) ? data.score : null;
  return { connected: true, score };
}

async function loadCanonicalEventsForDay(uid: string, day: string): Promise<CanonicalEventListItem[]> {
  const snap = await userCollection(uid, "events").where("day", "==", day).get();
  const items: CanonicalEventListItem[] = [];
  for (const d of snap.docs) {
    const raw = d.data() as Record<string, unknown>;
    const startVal =
      typeof raw["start"] === "string" ? raw["start"] : toIsoFromTimestampLike(raw["start"]);
    const endVal = typeof raw["end"] === "string" ? raw["end"] : toIsoFromTimestampLike(raw["end"]);
    const createdAt =
      typeof raw["createdAt"] === "string"
        ? raw["createdAt"]
        : toIsoFromTimestampLike(raw["createdAt"]);
    const updatedAt =
      typeof raw["updatedAt"] === "string"
        ? raw["updatedAt"]
        : toIsoFromTimestampLike(raw["updatedAt"]);
    if (!startVal || !endVal || !createdAt || !updatedAt) continue;
    const item = {
      id: d.id,
      userId: raw["userId"],
      sourceId: raw["sourceId"],
      kind: raw["kind"],
      start: startVal,
      end: endVal,
      day: raw["day"],
      timezone: raw["timezone"],
      createdAt,
      updatedAt,
      schemaVersion: raw["schemaVersion"],
    };
    const validated = canonicalEventListItemSchema.safeParse(item);
    if (validated.success) items.push(validated.data);
  }
  return items;
}

async function loadRawTimelineItemsForDay(uid: string, day: string): Promise<RawEventListItem[]> {
  const dayStart = `${day}T00:00:00.000Z`;
  const dayEnd = `${day}T23:59:59.999Z`;
  const snap = await userCollection(uid, "rawEvents")
    .where("observedAt", ">=", dayStart)
    .where("observedAt", "<=", dayEnd)
    .get();
  const items: RawEventListItem[] = [];
  for (const d of snap.docs) {
    const raw = d.data() as Record<string, unknown>;
    const kind = raw["kind"];
    if (kind !== "nutrition" && kind !== "incomplete") continue;
    const observedAt =
      typeof raw["observedAt"] === "string"
        ? raw["observedAt"]
        : toIsoFromTimestampLike(raw["observedAt"]);
    const receivedAt =
      typeof raw["receivedAt"] === "string"
        ? raw["receivedAt"]
        : toIsoFromTimestampLike(raw["receivedAt"]);
    if (!observedAt || !receivedAt) continue;
    const item = {
      id: d.id,
      userId: raw["userId"] ?? uid,
      sourceId: raw["sourceId"] ?? "unknown",
      kind,
      observedAt,
      receivedAt,
      schemaVersion: 1 as const,
      provenance: raw["provenance"],
      uncertaintyState: raw["uncertaintyState"],
      payload: raw["payload"],
    };
    const validated = rawEventListItemSchema.safeParse(item);
    if (validated.success) items.push(validated.data);
  }
  return items;
}

async function loadInsightsForDay(uid: string, day: string): Promise<InsightDto[]> {
  const snap = await userCollection(uid, "insights").where("date", "==", day).get();
  const items: InsightDto[] = [];
  for (const d of snap.docs) {
    const parsed = insightDtoSchema.safeParse(d.data());
    if (parsed.success) items.push(parsed.data);
  }
  return items;
}

async function loadDailyFactsForDay(uid: string, day: string): Promise<DailyFactsDto | null> {
  const snap = await userCollection(uid, "dailyFacts").doc(day).get();
  if (!snap.exists) return null;
  const parsed = dailyFactsDtoSchema.safeParse(snap.data());
  return parsed.success ? parsed.data : null;
}

/**
 * Load all sources needed to normalize one feed day.
 * Includes next-day sleep night when present so bedtime can land on sleep-start day.
 */
export async function loadTimelineDaySources(uid: string, day: string): Promise<TimelineDaySources> {
  const nextDay = dayMinusUtc(day, -1);
  const [events, rawItems, sleepNight, nextSleepNight, readiness, dailyFacts, insights] =
    await Promise.all([
      loadCanonicalEventsForDay(uid, day),
      loadRawTimelineItemsForDay(uid, day),
      loadSleepNightView(uid, day),
      loadSleepNightView(uid, nextDay),
      loadExactDayReadiness(uid, day),
      loadDailyFactsForDay(uid, day),
      loadInsightsForDay(uid, day),
    ]);

  const bedtimeNights: SleepNightViewDto[] = [];
  if (nextSleepNight) bedtimeNights.push(nextSleepNight);

  return {
    day,
    events,
    rawItems,
    sleepNight,
    bedtimeNights,
    readiness,
    dailyFacts,
    insights,
  };
}
