// lib/contracts/retrieval.ts
/**
 * Sprint 1 — Retrieval Surfaces (Library Backbone)
 *
 * Zod schemas for list/query endpoints:
 * - GET /users/me/raw-events
 * - GET /users/me/events
 * - GET /users/me/timeline
 * - GET /users/me/lineage
 */

import { z } from "zod";
import { dayKeySchema } from "./day";
import {
  rawEventKindSchema,
  uncertaintyStateSchema,
  provenanceSchema,
} from "./rawEvent";

const isoDateTimeSchema = z
  .string()
  .min(1)
  .refine((v) => !Number.isNaN(Date.parse(v)), "Invalid ISO datetime string");

// -----------------------------
// RawEvent list item (minimal for list/query)
// -----------------------------

export const rawEventListItemSchema = z
  .object({
    id: z.string().min(1),
    userId: z.string().min(1),
    sourceId: z.string().min(1),
    kind: rawEventKindSchema,
    observedAt: isoDateTimeSchema,
    receivedAt: isoDateTimeSchema,
    schemaVersion: z.literal(1),
    // Phase 2 — uncertainty visibility
    recordedAt: isoDateTimeSchema.optional(),
    provenance: provenanceSchema.optional(),
    uncertaintyState: uncertaintyStateSchema.optional(),
    contentUnknown: z.boolean().optional(),
    // Phase 2 — correction provenance
    correctionOfRawEventId: z.string().min(1).optional(),
  })
  .strip();

export type RawEventListItem = z.infer<typeof rawEventListItemSchema>;

export const rawEventsListResponseDtoSchema = z
  .object({
    items: z.array(rawEventListItemSchema),
    nextCursor: z.string().nullable(),
  })
  .strip();

export type RawEventsListResponseDto = z.infer<typeof rawEventsListResponseDtoSchema>;

// -----------------------------
// CanonicalEvent list item
// Source: mapRawEventToCanonical.ts / writeCanonicalEventImmutable.ts
// observedAt semantic for canonical = start (primary time)
// -----------------------------

export const canonicalEventKindSchema = z.enum([
  "sleep",
  "steps",
  "workout",
  "weight",
  "hrv",
  "nutrition",
  "strength_workout",
]);

export const canonicalEventListItemSchema = z
  .object({
    id: z.string().min(1),
    userId: z.string().min(1),
    sourceId: z.string().min(1),
    kind: canonicalEventKindSchema,
    start: isoDateTimeSchema,
    end: isoDateTimeSchema,
    day: dayKeySchema,
    timezone: z.string().min(1),
    createdAt: isoDateTimeSchema,
    updatedAt: isoDateTimeSchema,
    schemaVersion: z.literal(1),
  })
  .strip();

export type CanonicalEventListItem = z.infer<typeof canonicalEventListItemSchema>;

export const canonicalEventsListResponseDtoSchema = z
  .object({
    items: z.array(canonicalEventListItemSchema),
    nextCursor: z.string().nullable(),
  })
  .strip();

export type CanonicalEventsListResponseDto = z.infer<typeof canonicalEventsListResponseDtoSchema>;

// -----------------------------
// Timeline day summary
// -----------------------------

/** Phase 2 — Day completeness state for truth visibility */
export const dayCompletenessStateSchema = z.enum([
  "complete",
  "partial",
  "incomplete",
  "empty",
]);
export type DayCompletenessState = z.infer<typeof dayCompletenessStateSchema>;

/** Phase 2 — Rollup of uncertainty states present in the day (complete | incomplete | uncertain) */
export const uncertaintyStateRollupSchema = z
  .object({
    hasComplete: z.boolean().optional(),
    hasIncomplete: z.boolean().optional(),
    hasUncertain: z.boolean().optional(),
  })
  .strip();

export type UncertaintyStateRollup = z.infer<typeof uncertaintyStateRollupSchema>;

export const timelineDaySchema = z
  .object({
    day: dayKeySchema,
    canonicalCount: z.number().int().nonnegative(),
    hasDailyFacts: z.boolean(),
    hasInsights: z.boolean(),
    hasIntelligenceContext: z.boolean(),
    hasDerivedLedger: z.boolean(),
    // Phase 2 — uncertainty visibility at day level
    incompleteCount: z.number().int().nonnegative().optional(),
    hasIncompleteEvents: z.boolean().optional(),
    dayCompletenessState: dayCompletenessStateSchema.optional(),
    uncertaintyStateRollup: uncertaintyStateRollupSchema.optional(),
  })
  .strip();

export type TimelineDay = z.infer<typeof timelineDaySchema>;

export const timelineResponseDtoSchema = z
  .object({
    days: z.array(timelineDaySchema),
  })
  .strip();

export type TimelineResponseDto = z.infer<typeof timelineResponseDtoSchema>;

// -----------------------------
// Lineage: raw → canonical → derived mapping
// -----------------------------

export const lineageResponseDtoSchema = z
  .object({
    rawEventIds: z.array(z.string().min(1)),
    canonicalEventId: z.string().min(1).nullable(),
    derivedLedgerRuns: z.array(
      z.object({
        day: dayKeySchema,
        runId: z.string().min(1),
        computedAt: isoDateTimeSchema,
      }),
    ),
  })
  .strip();

export type LineageResponseDto = z.infer<typeof lineageResponseDtoSchema>;

// -----------------------------
// Query param schemas (fail-closed)
// -----------------------------

/** start/end: YYYY-MM-DD or ISO datetime */
const dayOrIsoSchema = z
  .string()
  .min(1)
  .refine(
    (v) =>
      /^\d{4}-\d{2}-\d{2}$/.test(v) || !Number.isNaN(Date.parse(v)),
    "Must be YYYY-MM-DD or valid ISO datetime",
  );

export const rawEventsListQuerySchema = z
  .object({
    start: dayOrIsoSchema.optional(),
    end: dayOrIsoSchema.optional(),
    kinds: z
      .string()
      .optional()
      .transform((v) => (v ? v.split(",").map((k) => k.trim()).filter(Boolean) : undefined)),
    // Phase 2 — Library search filters (deterministic)
    provenance: z
      .string()
      .optional()
      .transform((v) => (v ? v.split(",").map((k) => k.trim()).filter(Boolean) : undefined)),
    uncertaintyState: z
      .string()
      .optional()
      .transform((v) => (v ? v.split(",").map((k) => k.trim()).filter(Boolean) : undefined)),
    q: z.string().optional(), // keyword: filters payload.note for incomplete; id substring
    cursor: z.string().optional(),
    limit: z.coerce.number().int().min(1).max(100).default(50),
  })
  .strip();

export const canonicalEventsListQuerySchema = z
  .object({
    start: dayOrIsoSchema.optional(),
    end: dayOrIsoSchema.optional(),
    kinds: z
      .string()
      .optional()
      .transform((v) => (v ? v.split(",").map((k) => k.trim()).filter(Boolean) : undefined)),
    cursor: z.string().optional(),
    limit: z.coerce.number().int().min(1).max(100).default(50),
  })
  .strip();

export const timelineQuerySchema = z
  .object({
    start: dayKeySchema,
    end: dayKeySchema,
  })
  .strip();

export const lineageQuerySchema = z
  .object({
    canonicalEventId: z.string().min(1).optional(),
    day: dayKeySchema.optional(),
    kind: z.string().min(1).optional(),
    observedAt: isoDateTimeSchema.optional(),
  })
  .strip()
  .refine(
    (v) => {
      if (v.canonicalEventId) return true;
      return !!(v.day && v.kind && v.observedAt);
    },
    { message: "Must provide canonicalEventId OR (day + kind + observedAt)" },
  );
