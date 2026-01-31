// services/api/src/types/events.ts
import { z } from "zod";

/**
 * ============================================================================
 * Phase 1 — Ingestion Contract (AUTHORITATIVE)
 * ============================================================================
 *
 * This file is the SINGLE SOURCE OF TRUTH for what the Cloud Run ingestion
 * gateway ACCEPTS.
 *
 * If a kind / provider / field is NOT defined here:
 *   → it MUST NOT be accepted at the ingestion boundary.
 *
 * IMPORTANT:
 * - Downstream systems (functions, derived pipelines, clients) may support
 *   additional kinds, but they do NOT become ingestible until added HERE.
 * - This prevents silent drift and preserves Phase 1 trust guarantees.
 *
 * Do NOT “keep in sync” manually — change THIS file first.
 */

/**
 * Supported RawEvent kinds accepted by the ingestion gateway TODAY.
 *
 * Adding a new kind here is a Phase 1–critical change and must be deliberate.
 */
export const rawEventKindSchema = z.enum([
  "sleep",
  "steps",
  "workout",
  "weight",
  "hrv",
  "nutrition",
]);
export type RawEventKind = z.infer<typeof rawEventKindSchema>;

/**
 * --------------------------------------------------------------------------
 * Step 7 — New Kind Contract: nutrition
 * --------------------------------------------------------------------------
 *
 * Phase 1 rule for kind expansion:
 * - Ingestion MUST be contracts-first and fail-closed.
 * - New kinds must not rely on opaque payloads.
 * - Time anchors + units must be explicit.
 */

const isoDateTimeStringSchema = z
  .string()
  .min(1)
  .refine((v) => !Number.isNaN(Date.parse(v)), {
    message: "Invalid ISO datetime string",
  });

/**
 * Nutrition payload (manual) — strict daily macro totals.
 *
 * Time anchors:
 * - start/end: explicit window in ISO datetime
 * - timezone: explicit IANA timezone
 *
 * Units:
 * - totalKcal: kilocalories
 * - proteinG / carbsG / fatG / fiberG: grams
 */
export const manualNutritionPayloadSchema = z
  .object({
    start: isoDateTimeStringSchema,
    end: isoDateTimeStringSchema,
    timezone: z.string().min(1),

    totalKcal: z.number().finite().nonnegative(),
    proteinG: z.number().finite().nonnegative(),
    carbsG: z.number().finite().nonnegative(),
    fatG: z.number().finite().nonnegative(),
    fiberG: z.number().finite().nonnegative().nullable().optional(),
  })
  .strict();

/**
 * Supported providers at the ingestion boundary.
 * Phase 1 accepts only manual ingestion.
 */
export const rawEventProviderSchema = z.enum(["manual"]);
export type RawEventProvider = z.infer<typeof rawEventProviderSchema>;

/**
 * Schema versions accepted at the ingestion boundary.
 * Phase 1 supports only version 1.
 */
export const rawEventSchemaVersionSchema = z.literal(1);
export type RawEventSchemaVersion = z.infer<typeof rawEventSchemaVersionSchema>;

/**
 * RawEvent ingestion request body for the Cloud Run gateway.
 *
 * Time semantics:
 * - `observedAt` is preferred and canonical.
 * - `occurredAt` is accepted for backward compatibility.
 * - Exactly one of them MUST be present.
 *
 * Source semantics (Phase 1 Trust Boundary):
 * - `sourceId` is REQUIRED and must correspond to a user-registered source.
 * - There are NO implicit / anonymous / default sources at ingestion time.
 *
 * Timezone semantics (Phase 1 Truth Boundary):
 * - `timeZone` is REQUIRED by the API route and must be a valid IANA timezone.
 * - We accept the key here to keep the contract strict + aligned with the route.
 * - Enforcement (required + IANA validation) happens in the route to fail closed.
 *
 * Payload semantics:
 * - Existing Phase 1 kinds are opaque at the ingestion boundary.
 * - Step 7 expansion rule: new kinds MUST define strict payload schemas here.
 */
export const ingestRawEventSchema = z
  .object({
    provider: rawEventProviderSchema.default("manual"),
    kind: rawEventKindSchema,

    // Phase 1 schema version (fail-closed)
    schemaVersion: rawEventSchemaVersionSchema.default(1),

    // Preferred canonical time
    observedAt: isoDateTimeStringSchema.optional(),

    // Legacy compatibility
    occurredAt: isoDateTimeStringSchema.optional(),

    // REQUIRED (no defaults). Must be validated server-side against source registry.
    sourceId: z.string().min(1),

    /**
     * Accepted by contract so `.strict()` doesn't reject it.
     * The route enforces:
     * - required
     * - IANA validity (Intl.DateTimeFormat(..., { timeZone }))
     */
    timeZone: z.string().min(1).optional(),

    /**
     * Payload semantics:
     * - Phase 1 historically treated payload as opaque at the API boundary.
     * - Step 7 requires NEW kinds to be contracted strictly here.
     *
     * NOTE:
     * - Existing kinds remain opaque to avoid breaking established clients.
     * - The route still validates the authoritative Firestore doc via @oli/contracts.
     */
    payload: z.unknown(),
  })
  .strict()
  .superRefine((val, ctx) => {
    if (!val.observedAt && !val.occurredAt) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Either observedAt or occurredAt is required",
        path: ["observedAt"],
      });
    }

    // Step 7: nutrition is fail-closed with a strict payload contract.
    if (val.kind === "nutrition") {
      const observedAt = val.observedAt ?? val.occurredAt;
      const parsed = manualNutritionPayloadSchema.safeParse(val.payload);
      if (!parsed.success) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Invalid payload for kind=\"nutrition\"",
          path: ["payload"],
        });
        return;
      }

      // Proof-backed time anchor alignment:
      // - observedAt must equal payload.start to preserve Step 1 dayKey authority.
      if (typeof observedAt === "string" && parsed.data.start !== observedAt) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "For nutrition, observedAt must equal payload.start",
          path: ["observedAt"],
        });
      }

      // Keep timezone semantics explicit and consistent.
      if (
        typeof val.timeZone === "string" &&
        val.timeZone !== parsed.data.timezone
      ) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "For nutrition, timeZone must equal payload.timezone",
          path: ["timeZone"],
        });
      }
    }
  });

export type IngestRawEventBody = z.infer<typeof ingestRawEventSchema>;
