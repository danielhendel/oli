// services/functions/src/normalization/onRawEventCreated.ts

import { onDocumentCreated } from "firebase-functions/v2/firestore";
import * as logger from "firebase-functions/logger";
import { mapRawEventToCanonical, isFactOnlyKind } from "./mapRawEventToCanonical";
import { parseRawEvent } from "../validation/rawEvent";
import { writeCanonicalEventImmutable } from "./writeCanonicalEventImmutable";
import { upsertRawEventDedupeEvidence } from "../ingestion/rawEventDedupe";
import { writeFailureImmutable } from "../failures/writeFailureImmutable";
import { recomputeDerivedTruthForDay } from "../pipeline/recomputeForDay";
import { db } from "../firebaseAdmin";
import type { DailyBodyFacts, YmdDateString } from "../types/health";

function toYmdUtc(d: Date): string {
  const y = d.getUTCFullYear();
  const m = (d.getUTCMonth() + 1).toString().padStart(2, "0");
  const day = d.getUTCDate().toString().padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function deriveDayFromRaw(raw: Record<string, unknown> | undefined): string | null {
  if (!raw) return null;
  const observedAt = raw["observedAt"];
  const timeZone = raw["timeZone"];
  if (typeof observedAt !== "string" || typeof timeZone !== "string") return null;
  try {
    const d = new Date(observedAt);
    if (Number.isNaN(d.getTime())) return null;
    const fmt = new Intl.DateTimeFormat("en-CA", { timeZone });
    return fmt.format(d);
  } catch {
    return null;
  }
}

/**
 * Derive dayKey and factOnlyBody from a fact-only rawEvent (e.g. weight).
 * Must match canonical day derivation: Intl.DateTimeFormat("en-CA", { timeZone }).
 */
function extractFactOnlyContext(
  rawEvent: { kind: string; payload: unknown },
): { dayKey: YmdDateString; factOnlyBody: DailyBodyFacts } | null {
  if (!isFactOnlyKind(rawEvent.kind)) return null;

  if (rawEvent.kind === "weight") {
    const p = rawEvent.payload as Record<string, unknown> | undefined;
    if (!p || typeof p["time"] !== "string" || typeof p["timezone"] !== "string") return null;
    const weightKg = p["weightKg"];
    if (typeof weightKg !== "number" || !Number.isFinite(weightKg) || weightKg <= 0) return null;

    try {
      const d = new Date(p["time"] as string);
      if (Number.isNaN(d.getTime())) return null;
      const fmt = new Intl.DateTimeFormat("en-CA", { timeZone: p["timezone"] as string });
      const dayKey = fmt.format(d) as YmdDateString;

      const bodyFatPercent = p["bodyFatPercent"];
      const factOnlyBody: DailyBodyFacts = {
        weightKg,
        ...(typeof bodyFatPercent === "number" &&
        Number.isFinite(bodyFatPercent) &&
        bodyFatPercent >= 0 &&
        bodyFatPercent <= 100
          ? { bodyFatPercent }
          : {}),
      };

      return { dayKey, factOnlyBody };
    } catch {
      return null;
    }
  }

  return null;
}

/** Bounded zod issue summary (no raw payload dumps) */
function boundedZodSummary(issues: unknown): Record<string, unknown> {
  if (!issues || typeof issues !== "object") return { _: "unknown" };
  const obj = issues as Record<string, unknown>;
  const out: Record<string, unknown> = {};
  if (Array.isArray(obj["formErrors"])) out.formErrors = obj.formErrors;
  if (obj["fieldErrors"] && typeof obj.fieldErrors === "object") {
    const fe = obj.fieldErrors as Record<string, unknown>;
    out.fieldErrors = Object.keys(fe)
      .slice(0, 10)
      .reduce((acc, k) => {
        acc[k] = fe[k];
        return acc;
      }, {} as Record<string, unknown>);
  }
  return Object.keys(out).length > 0 ? out : { _: "validation_failed" };
}

/**
 * Firestore trigger:
 *   Input:  /users/{userId}/rawEvents/{rawEventId}
 *   Output: /users/{userId}/events/{canonicalEventId}
 *
 * Behavior:
 * - Validates RawEvent envelope strictly (fail fast).
 * - Records replay/duplicate evidence (no silent duplication).
 * - Maps RawEvent → CanonicalEvent via pure mapper.
 * - Writes canonical truth immutably (create-only OR identical-on-replay).
 * - Logs failures (no silent drops).
 * - Avoids logging any user PII.
 *
 * Phase 1 / Step 1 invariant:
 * - Canonical `day` must be derived deterministically from the authoritative time anchor
 *   and timezone, using Intl.DateTimeFormat("en-CA", { timeZone }).
 *   (Enforced inside mapRawEventToCanonical; this trigger preserves that authority.)
 */
export const onRawEventCreated = onDocumentCreated(
  {
    document: "users/{userId}/rawEvents/{rawEventId}",
    region: "us-central1",
    serviceAccount: "oli-functions-runtime@oli-staging-fdbba.iam.gserviceaccount.com",
  },
  async (event) => {
    const snapshot = event.data;
    if (!snapshot) return;

    const parsed = parseRawEvent(snapshot.data());
    if (!parsed.ok) {
      logger.warn("Invalid RawEvent envelope (dropping)", {
        path: snapshot.ref.path,
        reason: parsed.reason,
      });
      const rawData = snapshot.data() as Record<string, unknown> | undefined;
      const day = deriveDayFromRaw(rawData) ?? toYmdUtc(new Date());
      try {
        await writeFailureImmutable(
          {},
          {
            userId: event.params.userId,
            source: "normalization",
            stage: "rawEvent.validate",
            reasonCode: "RAW_EVENT_INVALID",
            message: "RawEvent failed contract validation",
            day,
            rawEventId: event.params.rawEventId,
            details: boundedZodSummary(parsed.issues),
          },
        );
      } catch (err) {
        logger.error("Failed to write failure record", {
          path: snapshot.ref.path,
          error: err instanceof Error ? err.message : String(err),
        });
      }
      return;
    }

    const rawEvent = parsed.value;
    const rawData = snapshot.data() as Record<string, unknown>;
    const payload = rawEvent.payload as Record<string, unknown> | undefined;

    // [INSTRUMENTATION] Sprint 0 prod debug — remove after root cause fixed
    logger.info("ON_RAW_EVENT_CREATED", {
      msg: "ON_RAW_EVENT_CREATED",
      userId: rawEvent.userId,
      rawEventId: rawEvent.id,
      kind: rawEvent.kind,
      observedAt: rawEvent.observedAt,
      timeZone: rawData["timeZone"] ?? payload?.["timezone"] ?? "(missing)",
      dayKey: payload?.["day"] ?? rawData["dayKey"] ?? "(derived)",
    });

    // Optional extra guard: ensure doc path user matches payload userId
    const pathUserId = event.params.userId;
    if (rawEvent.userId !== pathUserId) {
      logger.warn("RawEvent userId mismatch (dropping)", {
        path: snapshot.ref.path,
        pathUserId,
        rawUserId: rawEvent.userId,
      });
      return;
    }

    // Step 2: record duplicate/replay evidence (does not alter ingestion behavior).
    // Validate contract-first inside the dedupe helper by passing the raw snapshot data.
    try {
      const dedupe = await upsertRawEventDedupeEvidence({
        userId: rawEvent.userId,
        rawEvent: snapshot.data(),
      });

      if (!dedupe.ok) {
        logger.warn("RawEvent dedupe evidence skipped due to invalid contract", {
          path: snapshot.ref.path,
          userId: rawEvent.userId,
        });
      }
    } catch (err) {
      // Never throw: ingestion must remain stable and retries would create noise.
      logger.error("Failed to write RawEvent dedupe evidence", {
        userId: rawEvent.userId,
        rawEventId: rawEvent.id,
        provider: rawEvent.provider,
        kind: rawEvent.kind,
        error: err instanceof Error ? err.message : String(err),
      });
    }

    // Pure deterministic normalization
    const result = mapRawEventToCanonical(rawEvent);

    if (!result.ok) {
      const details = result.details as Record<string, unknown> | undefined;
      const isFactOnly = details?.factOnly === true;

      if (isFactOnly) {
        // Fact-only: trigger derived truth recompute (no canonical event).
        const ctx = extractFactOnlyContext(rawEvent);
        logger.info("FACT_ONLY_BRANCH_ENTERED", {
          msg: "FACT_ONLY_BRANCH_ENTERED",
          kind: rawEvent.kind,
          rawEventId: rawEvent.id,
          ctxDayKey: ctx?.dayKey ?? "(extract failed)",
          factOnlyBodyWeightKg: ctx?.factOnlyBody?.weightKg,
        });
        if (!ctx) {
          logger.warn("Fact-only rawEvent missing/invalid payload (writing failure)", {
            userId: rawEvent.userId,
            rawEventId: rawEvent.id,
            kind: rawEvent.kind,
          });
          const day =
            deriveDayFromRaw(snapshot.data() as Record<string, unknown>) ?? toYmdUtc(new Date());
          try {
            await writeFailureImmutable(
              {},
              {
                userId: rawEvent.userId,
                source: "normalization",
                stage: "factOnly.extract",
                reasonCode: "FACT_ONLY_INVALID_PAYLOAD",
                message: "Fact-only rawEvent payload missing or invalid (time, timezone, weightKg)",
                day,
                rawEventId: rawEvent.id,
                details: { kind: rawEvent.kind },
              },
            );
          } catch (err) {
            logger.error("Failed to write failure record (factOnly.extract)", {
              userId: rawEvent.userId,
              rawEventId: rawEvent.id,
              error: err instanceof Error ? err.message : String(err),
            });
          }
          return;
        }

        try {
          logger.info("FACT_ONLY_RECOMPUTE_START", {
            msg: "FACT_ONLY_RECOMPUTE_START",
            userId: rawEvent.userId,
            dayKey: ctx.dayKey,
            trigger: "onRawEventCreated_factOnly",
          });
          await recomputeDerivedTruthForDay({
            db,
            userId: rawEvent.userId,
            dayKey: ctx.dayKey,
            factOnlyBody: ctx.factOnlyBody,
            trigger: { type: "factOnly", rawEventId: rawEvent.id },
          });
          logger.info("FACT_ONLY_RECOMPUTE_DONE", {
            msg: "FACT_ONLY_RECOMPUTE_DONE",
            userId: rawEvent.userId,
            dayKey: ctx.dayKey,
          });
        } catch (err) {
          logger.error("FACT_ONLY_RECOMPUTE_ERROR", {
            msg: "FACT_ONLY_RECOMPUTE_ERROR",
            userId: rawEvent.userId,
            rawEventId: rawEvent.id,
            kind: rawEvent.kind,
            dayKey: ctx.dayKey,
            error: err instanceof Error ? err.message : String(err),
            stack: err instanceof Error ? err.stack : undefined,
          });
          try {
            await writeFailureImmutable(
              {},
              {
                userId: rawEvent.userId,
                source: "normalization",
                stage: "factOnly.recompute",
                reasonCode: "FACT_ONLY_RECOMPUTE_FAILED",
                message: "Derived truth recompute failed for fact-only rawEvent",
                day: ctx.dayKey,
                rawEventId: rawEvent.id,
                details: { kind: rawEvent.kind, error: err instanceof Error ? err.message : String(err) },
              },
            );
          } catch (writeErr) {
            logger.error("Failed to write failure record (factOnly.recompute)", {
              userId: rawEvent.userId,
              rawEventId: rawEvent.id,
              error: writeErr instanceof Error ? writeErr.message : String(writeErr),
            });
          }
        }
        return;
      }

      // Non-fact-only: write failure
      logger.warn("Normalization failed", {
        userId: rawEvent.userId,
        rawEventId: rawEvent.id,
        provider: rawEvent.provider,
        kind: rawEvent.kind,
        reason: result.reason,
        ...(details ? { details } : {}),
      });
      const day = deriveDayFromRaw(snapshot.data() as Record<string, unknown>) ?? toYmdUtc(new Date());
      const reasonCode =
        result.reason === "UNSUPPORTED_KIND" ? "RAW_KIND_UNSUPPORTED" : "NORMALIZE_ERROR";
      try {
        await writeFailureImmutable(
          {},
          {
            userId: rawEvent.userId,
            source: "normalization",
            stage: "normalize.map",
            reasonCode,
            message: `Normalization failed: ${result.reason}`,
            day,
            rawEventId: rawEvent.id,
            ...(details ? { details } : {}),
          },
        );
      } catch (err) {
        logger.error("Failed to write failure record (normalize.map)", {
          userId: rawEvent.userId,
          rawEventId: rawEvent.id,
          error: err instanceof Error ? err.message : String(err),
        });
      }
      return;
    }

    const canonical = result.canonical;

    const writeRes = await writeCanonicalEventImmutable({
      userId: rawEvent.userId,
      canonical,
      sourceRawEventId: rawEvent.id,
      sourceRawEventPath: snapshot.ref.path,
    });

    if (!writeRes.ok) {
      // Important: do not throw (would cause retries and noise).
      // This is a real integrity violation that must be investigated.
      logger.error("Canonical write conflict: immutability prevented overwrite", {
        userId: rawEvent.userId,
        canonicalId: canonical.id,
        existingHash: writeRes.existingHash,
        incomingHash: writeRes.incomingHash,
        integrityViolationPath: writeRes.integrityViolationPath,
      });
      try {
        await writeFailureImmutable(
          {},
          {
            userId: rawEvent.userId,
            source: "normalization",
            stage: "canonical.write",
            reasonCode: "CANONICAL_IMMUTABILITY_CONFLICT",
            message: "Canonical immutability conflict: attempted overwrite with different content",
            day: canonical.day,
            rawEventId: rawEvent.id,
            canonicalEventId: canonical.id,
            details: {
              existingHash: writeRes.existingHash,
              incomingHash: writeRes.incomingHash,
            },
          },
        );
      } catch (err) {
        logger.error("Failed to write failure record (canonical.write)", {
          userId: rawEvent.userId,
          canonicalId: canonical.id,
          error: err instanceof Error ? err.message : String(err),
        });
      }
    }
  },
);
