// lib/contracts/derivedLedger.ts
import { z } from "zod";
import { dayKeySchema } from "./day";
import { dailyFactsDtoSchema } from "./dailyFacts";
import { intelligenceContextDtoSchema } from "./intelligenceContext";
import { insightsResponseDtoSchema } from "./insights";

const isoString = z.string().min(1);

const triggerSchema = z.union([
  z
    .object({
      type: z.literal("realtime"),
      name: z.literal("onCanonicalEventCreated"),
      eventId: z.string().min(1),
    })
    .strip(),
  z
    .object({
      type: z.literal("scheduled"),
      name: z.string().min(1),
      eventId: z.string().min(1),
    })
    .strip(),
]);

export const derivedLedgerRunSummaryDtoSchema = z
  .object({
    schemaVersion: z.literal(1),
    runId: z.string().min(1),
    userId: z.string().min(1),
    date: dayKeySchema,
    computedAt: isoString,
    pipelineVersion: z.number().int().positive(),
    trigger: triggerSchema,
    latestCanonicalEventAt: isoString.optional(),
    outputs: z
      .object({
        hasDailyFacts: z.boolean(),
        insightsCount: z.number().int().nonnegative(),
        hasIntelligenceContext: z.boolean(),
      })
      .strip(),
    createdAt: isoString, // API-normalized
  })
  .strip();

export type DerivedLedgerRunSummaryDto = z.infer<typeof derivedLedgerRunSummaryDtoSchema>;

export const derivedLedgerRunsResponseDtoSchema = z
  .object({
    day: dayKeySchema,
    latestRunId: z.string().min(1).optional(),
    runs: z.array(derivedLedgerRunSummaryDtoSchema),
  })
  .strip();

export type DerivedLedgerRunsResponseDto = z.infer<typeof derivedLedgerRunsResponseDtoSchema>;

export const derivedLedgerReplayResponseDtoSchema = z
  .object({
    day: dayKeySchema,
    runId: z.string().min(1),
    computedAt: isoString,
    pipelineVersion: z.number().int().positive(),
    trigger: triggerSchema,
    latestCanonicalEventAt: isoString.optional(),

    // Snapshots (nullable when missing)
    dailyFacts: dailyFactsDtoSchema.optional(),
    intelligenceContext: intelligenceContextDtoSchema.optional(),
    insights: insightsResponseDtoSchema.optional(),
  })
  .strip();

export type DerivedLedgerReplayResponseDto = z.infer<typeof derivedLedgerReplayResponseDtoSchema>;
