// services/api/src/routes/uploads.ts
import { Router, type Response } from "express";
import crypto from "crypto";
import { z } from "zod";

import type { AuthedRequest } from "../middleware/auth";
import { userCollection } from "../db";
import { rawEventDocSchema } from "@oli/contracts";
import { admin } from "../firebaseAdmin";
import { requireActiveSource } from "../ingestion/sourceGating";
import { rawEventSchemaVersionSchema } from "../types/events";

const router = Router();

/**
 * Upload ingestion request (AUTHENTICATED)
 *
 * Phase 1 requirements:
 * - Must be idempotent + replay-safe
 * - Must store bytes (or explicitly fail) + store a verifiable reference
 * - Must emit a RawEvent (memory entry) for the upload
 *
 * Phase 1 design choice (Option A):
 * - This route treats uploads as "memory-only" RawEvents (kind: "file")
 * - No parsing (payload is strictly storage reference + integrity metadata)
 * - Normalization may ignore these; Phase 1 still requires them to exist in the Personal Health Library
 *
 * PHASE 1 TRUST BOUNDARY:
 * - Requires sourceId
 * - Validates source exists, belongs to user, active
 * - Validates kind="file" + schemaVersion are allowed by source
 */

// --------- Request validation ---------

const uploadBodySchema = z
  .object({
    // REQUIRED: must correspond to a user-registered source
    sourceId: z.string().min(1),

    // Phase 1 schema version (fail-closed)
    schemaVersion: rawEventSchemaVersionSchema.default(1),

    fileBase64: z.string().min(1),
    filename: z.string().min(1),
    mimeType: z.string().min(1),
  })
  .strict();

type UploadBody = z.infer<typeof uploadBodySchema>;

const getIdempotencyKey = (req: AuthedRequest): string | undefined => {
  const anyReq = req as unknown as { idempotencyKey?: unknown };
  const fromMiddleware = typeof anyReq.idempotencyKey === "string" ? anyReq.idempotencyKey : undefined;

  const fromHeader =
    (typeof req.header("Idempotency-Key") === "string" ? req.header("Idempotency-Key") : undefined) ??
    (typeof req.header("X-Idempotency-Key") === "string" ? req.header("X-Idempotency-Key") : undefined);

  return fromMiddleware ?? fromHeader ?? undefined;
};

const requireStorageBucket = (): string => {
  const bucket = (process.env.FIREBASE_STORAGE_BUCKET ?? "").trim();
  if (!bucket) {
    // We do NOT guess a default bucket name here.
    // Your firebaseAdmin.ts does not set storageBucket in initializeApp(),
    // so admin.storage().bucket() has no canonical default.
    throw new Error("Missing FIREBASE_STORAGE_BUCKET env var");
  }
  return bucket;
};

// --------- Storage write ---------

async function writeUploadToStorage(args: {
  bucket: string;
  objectPath: string;
  mimeType: string;
  bytes: Buffer;
  metadata: Record<string, string>;
}): Promise<{ bucket: string; objectPath: string }> {
  const bucketRef = admin.storage().bucket(args.bucket);
  const fileRef = bucketRef.file(args.objectPath);

  // Prevent accidental overwrite (idempotent storage behavior)
  // If the object already exists, this will fail rather than silently replacing bytes.
  await fileRef.save(args.bytes, {
    resumable: false,
    contentType: args.mimeType,
    metadata: {
      metadata: args.metadata,
    },
    preconditionOpts: { ifGenerationMatch: 0 },
  });

  return { bucket: args.bucket, objectPath: args.objectPath };
}

// --------- Route ---------

router.post("/", async (req: AuthedRequest, res: Response) => {
  const uid = req.uid;
  if (!uid) {
    return res.status(401).json({ ok: false as const, error: "Unauthorized" });
  }

  const idempotencyKey = getIdempotencyKey(req);
  if (!idempotencyKey) {
    return res.status(400).json({
      ok: false as const,
      error: {
        code: "MISSING_IDEMPOTENCY_KEY" as const,
        message: "Idempotency-Key header is required for upload ingestion",
      },
    });
  }

  const parsed = uploadBodySchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({
      ok: false as const,
      error: "Invalid upload payload",
      details: parsed.error.flatten(),
    });
  }

  const body: UploadBody = parsed.data;

  // Trust boundary: validate source BEFORE any replay acceptance.
  // This prevents a bypass where a legacy rawEvent exists without valid source attribution.
  const sourceCheck = await requireActiveSource({
    uid,
    sourceId: body.sourceId,
    kind: "file",
    schemaVersion: body.schemaVersion,
  });

  if (!sourceCheck.ok) {
    return res.status(sourceCheck.status).json({
      ok: false as const,
      error: {
        code: sourceCheck.code,
        message: sourceCheck.message,
      },
    });
  }

  // RawEvents live under the user scope
  const rawEventsCol = userCollection(uid, "rawEvents");

  // ✅ Mandatory idempotency: doc id is deterministic and replay-safe
  const docRef = rawEventsCol.doc(idempotencyKey);
  const rawEventId = docRef.id;

  // If the RawEvent already exists, treat this as an idempotent replay and DO NOT re-upload bytes.
  // This prevents orphan storage objects on replay.
  const existing = await docRef.get();
  if (existing.exists) {
    return res.status(202).json({
      ok: true as const,
      rawEventId,
      idempotentReplay: true as const,
    });
  }

  let buffer: Buffer;
  try {
    buffer = Buffer.from(body.fileBase64, "base64");
  } catch {
    return res.status(400).json({
      ok: false as const,
      error: "Invalid fileBase64 (not base64)",
    });
  }

  if (buffer.length === 0) {
    return res.status(400).json({ ok: false as const, error: "Empty upload" });
  }

  // Integrity hash of the bytes (payload truth)
  const fileHash = crypto.createHash("sha256").update(buffer).digest("hex");

  // Store under a deterministic path; include filename to preserve user meaning.
  // Keep filename sanitized-ish (no slashes).
  const safeName = body.filename.replace(/[/\\]/g, "_");
  const objectPath = `uploads/${uid}/${fileHash}/${safeName}`;

  const observedAt = new Date().toISOString();
  const receivedAt = observedAt;

  let bucket: string;
  try {
    bucket = requireStorageBucket();
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown configuration error";
    return res.status(500).json({
      ok: false as const,
      error: { code: "UPLOAD_STORAGE_CONFIG_MISSING" as const, message },
    });
  }

  // Upload to storage FIRST so the RawEvent never points at missing bytes.
  // If storage write fails, fail closed.
  let storageRef: { bucket: string; objectPath: string };
  try {
    storageRef = await writeUploadToStorage({
      bucket,
      objectPath,
      mimeType: body.mimeType,
      bytes: buffer,
      metadata: {
        uid,
        rawEventId,
        sha256: fileHash,
        originalFilename: body.filename,
        mimeType: body.mimeType,
      },
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown storage error";
    return res.status(500).json({
      ok: false as const,
      error: {
        code: "UPLOAD_STORAGE_FAILED" as const,
        message,
      },
    });
  }

  const rawEvent = {
    id: rawEventId,
    userId: uid,

    kind: "file",
    provider: "manual",

    // Kept for contract compatibility; trust is enforced by sourceId registry.
    sourceType: "manual",

    // REQUIRED and registry-validated (no implicit actors)
    sourceId: body.sourceId,

    observedAt,
    receivedAt,

    payload: {
      storageBucket: storageRef.bucket,
      storagePath: storageRef.objectPath,
      sha256: fileHash,
      sizeBytes: buffer.length,
      mimeType: body.mimeType,
      originalFilename: body.filename,
    },

    schemaVersion: body.schemaVersion,
  };

  const validated = rawEventDocSchema.safeParse(rawEvent);
  if (!validated.success) {
    return res.status(400).json({
      ok: false as const,
      error: "Invalid upload raw event (contract)",
      details: validated.error.flatten(),
    });
  }

  try {
    await docRef.create(validated.data);
    return res.status(202).json({ ok: true as const, rawEventId });
  } catch {
    // Race protection: if created by another request between our pre-check and create()
    const raceExisting = await docRef.get();
    if (raceExisting.exists) {
      return res.status(202).json({
        ok: true as const,
        rawEventId,
        idempotentReplay: true as const,
      });
    }

    return res.status(500).json({ ok: false as const, error: "Upload ingestion failed" });
  }
});

export default router;

