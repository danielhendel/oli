// services/api/src/routes/events.ts
import crypto from "crypto";
import { Router, type Response } from "express";

import { rawEventDocSchema } from "../../../../lib/contracts";
import type { AuthedRequest } from "../middleware/auth";
import { ingestRawEventSchema, type IngestRawEventBody } from "../types/events";
import { userCollection } from "../db";

const router = Router();

const getIdempotencyKey = (req: AuthedRequest): string | undefined => {
  const anyReq = req as unknown as { idempotencyKey?: unknown };
  const fromMiddleware = typeof anyReq.idempotencyKey === "string" ? anyReq.idempotencyKey : undefined;

  const fromHeader =
    (typeof req.header("Idempotency-Key") === "string" ? req.header("Idempotency-Key") : undefined) ??
    (typeof req.header("X-Idempotency-Key") === "string" ? req.header("X-Idempotency-Key") : undefined);

  return fromMiddleware ?? fromHeader ?? undefined;
};

const dayKeyFromIso = (iso: string): string => new Date(iso).toISOString().slice(0, 10);

const stableStringify = (value: unknown): string => {
  const seen = new WeakSet<object>();

  const sorter = (v: unknown): unknown => {
    if (v === null) return null;
    if (typeof v !== "object") return v;
    if (v instanceof Date) return v.toISOString();
    if (Array.isArray(v)) return v.map(sorter);

    const obj = v as Record<string, unknown>;
    if (seen.has(obj)) throw new Error("Cannot stableStringify circular structure");
    seen.add(obj);

    return Object.keys(obj)
      .sort()
      .reduce<Record<string, unknown>>((acc, k) => {
        acc[k] = sorter(obj[k]);
        return acc;
      }, {});
  };

  return JSON.stringify(sorter(value));
};

const sha256Hex = (input: string): string => crypto.createHash("sha256").update(input, "utf8").digest("hex");

/**
 * Canonical ingestion gateway (AUTHENTICATED)
 *
 * ✅ Mounted at: POST /ingest   (see services/api/src/index.ts)
 *
 * IDENTITY + INTEGRITY:
 * - Requires Idempotency-Key (or X-Idempotency-Key)
 * - Uses that key as the Firestore doc id to guarantee idempotency
 * - Enforces conflict detection: same key + different payload => 409
 *
 * IMPORTANT:
 * - payloadHash MUST exclude volatile fields like receivedAt, otherwise replays will falsely conflict.
 */
router.post("/", async (req: AuthedRequest, res: Response) => {
  const uid = req.uid;
  if (!uid) {
    return res.status(401).json({ ok: false as const, error: "Unauthorized" });
  }

  const parsed = ingestRawEventSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({
      ok: false as const,
      error: "Invalid raw event",
      details: parsed.error.flatten(),
    });
  }

  const body: IngestRawEventBody = parsed.data;

  // Canonicalize timestamps
  const observedAt = body.observedAt ?? body.occurredAt;
  if (!observedAt) {
    return res.status(400).json({ ok: false as const, error: "Missing observedAt/occurredAt" });
  }

  const idempotencyKey = getIdempotencyKey(req);
  if (!idempotencyKey) {
    return res.status(400).json({
      ok: false as const,
      error: {
        code: "MISSING_IDEMPOTENCY_KEY" as const,
        message: "Idempotency-Key header is required for ingestion",
      },
    });
  }

  const receivedAt = new Date().toISOString();
  const day = dayKeyFromIso(observedAt);

  const sourceType = "manual" as const;
  const schemaVersion = 1 as const;
  const fingerprintVersion = 1 as const;

  // ✅ MUST be user-scoped
  const rawEventsCol = userCollection(uid, "rawEvents");

  // ✅ Mandatory idempotency: doc id is deterministic
  const docRef = rawEventsCol.doc(idempotencyKey);
  const rawEventId = docRef.id;

  /**
   * Fingerprint input MUST be stable across retries.
   * Therefore it MUST NOT include receivedAt (server time) or any other volatile field.
   */
  const fingerprintInput = {
    id: rawEventId,
    userId: uid,

    idempotencyKey,
    fingerprintVersion,

    sourceId: body.sourceId ?? "manual",
    sourceType,

    provider: body.provider,
    kind: body.kind,

    observedAt,

    payload: body.payload,

    schemaVersion,
  } as const;

  const payloadHash = sha256Hex(stableStringify(fingerprintInput));

  const doc = {
    ...fingerprintInput,
    receivedAt,
    payloadHash,
  } as const;

  const validated = rawEventDocSchema.safeParse(doc);
  if (!validated.success) {
    return res.status(400).json({
      ok: false as const,
      error: "Invalid raw event (contract)",
      details: validated.error.flatten(),
    });
  }

  try {
    await docRef.create(validated.data);
  } catch (err: unknown) {
    // If create() failed because the doc already exists, validate replay safety.
    const existingSnap = await docRef.get();
    if (existingSnap.exists) {
      const existing = existingSnap.data();
      const existingParsed = rawEventDocSchema.safeParse(existing);

      if (!existingParsed.success) {
        return res.status(409).json({
          ok: false as const,
          error: {
            code: "IDEMPOTENCY_EXISTING_DOC_INVALID" as const,
            message: "Existing RawEvent for this idempotency key is invalid",
          },
        });
      }

      if (existingParsed.data.payloadHash !== payloadHash) {
        return res.status(409).json({
          ok: false as const,
          error: {
            code: "IDEMPOTENCY_KEY_REUSE_CONFLICT" as const,
            message: "Idempotency key was reused with a different payload",
          },
        });
      }

      return res.status(202).json({
        ok: true as const,
        rawEventId,
        day,
        idempotentReplay: true as const,
      });
    }

    throw err;
  }

  return res.status(202).json({ ok: true as const, rawEventId, day });
});

export default router;
