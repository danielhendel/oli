// lib/contracts/dayTruth.ts
import { z } from "zod";
import { isoDateTimeStringSchema, ymdDateStringSchema } from "./rawEvent";

export const dayTruthSchemaVersionSchema = z.literal(1);

/**
 * Canonical DayTruth Firestore document schema (backend writes).
 */
export const dayTruthDocSchema = z
  .object({
    schemaVersion: dayTruthSchemaVersionSchema,

    id: ymdDateStringSchema,
    userId: z.string().min(1),
    date: ymdDateStringSchema,

    createdAt: isoDateTimeStringSchema,

    anchors: z
      .object({
        latestCanonicalEventAt: isoDateTimeStringSchema.optional(),
        dailyFactsComputedAt: isoDateTimeStringSchema.optional(),
        intelligenceComputedAt: isoDateTimeStringSchema.optional(),
      })
      .strip(),

    counts: z
      .object({
        eventsForDay: z.number().finite().nonnegative().optional(),
        insightsForDay: z.number().finite().nonnegative().optional(),
      })
      .strip(),

    readiness: z
      .object({
        hasDailyFacts: z.boolean(),
        hasIntelligenceContext: z.boolean(),
      })
      .strip(),
  })
  .strip();

export type DayTruthDoc = z.infer<typeof dayTruthDocSchema>;

/**
 * Client-facing DTO schema.
 *
 * IMPORTANT:
 * - Client code currently constructs lightweight placeholders.
 * - Therefore several fields are optional.
 * - However, we DEFAULT key metrics to prevent "possibly undefined" in UI.
 */
export const dayTruthDtoSchema = z
  .object({
    // Optional to support local placeholder objects
    schemaVersion: dayTruthSchemaVersionSchema.optional(),
    id: ymdDateStringSchema.optional(),
    userId: z.string().min(1).optional(),
    createdAt: isoDateTimeStringSchema.optional(),

    // Client expects `day`
    day: ymdDateStringSchema,

    // Client expects these at top-level
    latestCanonicalEventAt: isoDateTimeStringSchema.nullable().default(null),
    eventsCount: z.number().finite().nonnegative().default(0),
    insightsCount: z.number().finite().nonnegative().default(0),

    // Optional to support placeholder objects, but strongly typed when present
    readiness: z
      .object({
        hasDailyFacts: z.boolean(),
        hasIntelligenceContext: z.boolean(),
      })
      .optional(),
  })
  .strip();

export type DayTruthDto = z.infer<typeof dayTruthDtoSchema>;

/**
 * Map canonical stored DayTruthDoc -> client DayTruthDto.
 */
export const dayTruthDocToDto = (doc: DayTruthDoc): DayTruthDto => {
  return dayTruthDtoSchema.parse({
    schemaVersion: doc.schemaVersion,
    id: doc.id,
    userId: doc.userId,
    day: doc.date,
    createdAt: doc.createdAt,
    latestCanonicalEventAt: doc.anchors.latestCanonicalEventAt ?? null,
    eventsCount: doc.counts.eventsForDay ?? 0,
    insightsCount: doc.counts.insightsForDay ?? 0,
    readiness: doc.readiness,
  });
};

/**
 * Revisions are append-only snapshots keyed by revisionId.
 */
export const dayTruthRevisionDocSchema = dayTruthDocSchema.extend({
  revisionId: z.string().min(1),
});

export type DayTruthRevisionDoc = z.infer<typeof dayTruthRevisionDocSchema>;
