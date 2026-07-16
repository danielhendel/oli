/**
 * Timeline V1 — bounded presentation feed (`GET /users/me/timeline-feed`).
 *
 * Additive to aggregate `GET /users/me/timeline`. Privacy-safe DTO: no UID, email,
 * tokens, raw paths, raw provider payloads, or raw-event bodies.
 */

import { z } from "zod";

import { dayKeySchema } from "./day";

const isoDateTimeSchema = z
  .string()
  .min(1)
  .refine((v) => !Number.isNaN(Date.parse(v)), "Invalid ISO datetime string");

/** Presentation roles. `reminder` / `recommendation` reserved — v1 must not fabricate them. */
export const timelineDisplayRoleSchema = z.enum([
  "day_context",
  "chronological_event",
  "live_marker",
  "reminder",
  "recommendation",
]);
export type TimelineDisplayRole = z.infer<typeof timelineDisplayRoleSchema>;

/**
 * Closed presentation kinds grounded in Timeline v1 contract.
 * Includes context / synthetic kinds used only on the feed DTO.
 */
export const timelinePresentationKindSchema = z.enum([
  "sleep_context",
  "recovery_context",
  "sleep_start",
  "sleep_wake",
  "nutrition",
  "caffeine",
  "incomplete",
  "workout_strength",
  "workout_cardio",
  "workout",
  "steps",
  "weight",
  "insight",
  "activity_live",
  "activity_final",
]);
export type TimelinePresentationKind = z.infer<typeof timelinePresentationKindSchema>;

export const timelinePresentationStatusSchema = z.enum([
  "ready",
  "missing",
  "disconnected",
  "partial",
  "incomplete",
]);
export type TimelinePresentationStatus = z.infer<typeof timelinePresentationStatusSchema>;

/** Closed provenance labels safe for presentation (no raw provider payloads). */
export const timelinePresentationSourceSchema = z.enum([
  "manual",
  "device",
  "upload",
  "backfill",
  "correction",
  "oura",
  "derived",
  "synthetic",
  "unknown",
]);
export type TimelinePresentationSource = z.infer<typeof timelinePresentationSourceSchema>;

export const timelinePresentationItemSchema = z
  .object({
    id: z.string().min(1),
    kind: timelinePresentationKindSchema,
    day: dayKeySchema,
    occurredAt: isoDateTimeSchema,
    timezone: z.string().min(1),
    title: z.string().min(1),
    summary: z.string().min(1).optional(),
    status: timelinePresentationStatusSchema,
    source: timelinePresentationSourceSchema,
    provenance: z.string().min(1).optional(),
    destination: z.string().min(1),
    accessibilityLabel: z.string().min(1),
    dedupeKey: z.string().min(1),
    isSynthetic: z.boolean(),
    displayRole: timelineDisplayRoleSchema,
  })
  .strip();

export type TimelinePresentationItem = z.infer<typeof timelinePresentationItemSchema>;

export const timelineFeedQuerySchema = z
  .object({
    anchorDay: dayKeySchema.optional(),
    cursor: z.string().min(1).optional(),
    limit: z.coerce.number().int().min(1).max(100).default(50),
    /** Benign cache-bust; accepted and ignored. */
    _: z.string().optional(),
    /** API Gateway forwards API key as ?key=...; accepted and ignored. */
    key: z.string().min(1).optional(),
  })
  .strip()
  .transform((data) => ({
    anchorDay: data.anchorDay,
    cursor: data.cursor,
    limit: data.limit,
  }));

export type TimelineFeedQuery = z.infer<typeof timelineFeedQuerySchema>;

export const timelineFeedResponseDtoSchema = z
  .object({
    items: z.array(timelinePresentationItemSchema),
    sections: z.array(dayKeySchema),
    nextCursor: z.string().nullable(),
    hasMore: z.boolean(),
  })
  .strip();

export type TimelineFeedResponseDto = z.infer<typeof timelineFeedResponseDtoSchema>;

/**
 * Kind priority for equal `occurredAt` (lower sorts earlier).
 * Matches product contract §18.
 */
export const TIMELINE_FEED_KIND_PRIORITY: Readonly<Record<TimelinePresentationKind, number>> = {
  sleep_context: -20,
  recovery_context: -10,
  sleep_start: 0,
  nutrition: 10,
  caffeine: 10,
  incomplete: 20,
  workout_strength: 30,
  workout_cardio: 40,
  workout: 50,
  steps: 60,
  activity_final: 60,
  weight: 70,
  insight: 80,
  sleep_wake: 90,
  activity_live: 100,
};

export function timelineFeedKindPriority(kind: TimelinePresentationKind): number {
  return TIMELINE_FEED_KIND_PRIORITY[kind];
}
