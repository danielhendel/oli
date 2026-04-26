/**
 * POST /exercise-definitions/:exerciseId/media — isolated from exerciseDefinitions.ts so Jest route
 * tests that import the main CRUD router do not load firebase-admin.
 */
import { randomUUID } from "crypto";
import { Router, type Response } from "express";
import {
  exerciseDefinitionMediaUploadBodySchema,
  exerciseDefinitionMediaUploadResponseSchema,
  isUserScopedCustomExerciseId,
} from "@oli/contracts";

import type { AuthedRequest } from "../middleware/auth";
import { asyncHandler } from "../lib/asyncHandler";
import type { RequestWithRid } from "../lib/logger";
import { requireFirebaseStorageBucketId } from "../lib/firebaseStorageBucketId";
import { logger } from "../lib/logger";
import { userCollection } from "../db";
import { admin } from "../firebaseAdmin";

const router = Router();

const DIAG_PREFIX = "exercise_definition_media";

function getRequestId(req: AuthedRequest): string {
  const rid = (req as RequestWithRid).rid?.trim();
  if (rid && rid.length > 6) return rid;
  const h = req.header("x-request-id")?.trim();
  if (h && h.length > 6) return h;
  return "unknown";
}

function getTraceHeader(req: AuthedRequest): string | undefined {
  const v =
    req.header("x-cloud-trace-context") ??
    req.header("X-Cloud-Trace-Context") ??
    req.header("traceparent") ??
    req.header("Traceparent");
  const t = v?.trim();
  return t && t.length > 0 ? t : undefined;
}

function tracePart(req: AuthedRequest): { trace?: string } {
  const t = getTraceHeader(req);
  return t ? { trace: t } : {};
}

/** Structured stderr line for Cloud Logging (console discipline in tests matches `exercise_definition_media_`). */
function emitMediaDiag(req: AuthedRequest, eventSuffix: string, fields: Record<string, unknown> = {}): void {
  console.error(
    JSON.stringify({
      level: "error",
      msg: `${DIAG_PREFIX}_${eventSuffix}`,
      requestId: getRequestId(req),
      trace: getTraceHeader(req) ?? null,
      method: req.method,
      path: req.originalUrl,
      ...fields,
    }),
  );
}

function jsonError(
  req: AuthedRequest,
  res: Response,
  status: number,
  code: string,
  message: string,
  extras?: { details?: unknown },
): void {
  res.status(status).json({
    ok: false,
    error: {
      code,
      message,
      requestId: getRequestId(req),
      ...tracePart(req),
      ...(extras?.details !== undefined ? { details: extras.details } : {}),
    },
  });
}

function safeExerciseMediaFilename(name: string): string {
  return name.replace(/[/\\]/g, "_").replace(/\s+/g, " ").trim().slice(0, 120) || "upload.bin";
}

function buildFirebaseDownloadUrl(bucket: string, objectPath: string, downloadToken: string): string {
  const encPath = encodeURIComponent(objectPath);
  return `https://firebasestorage.googleapis.com/v0/b/${encodeURIComponent(bucket)}/o/${encPath}?alt=media&token=${encodeURIComponent(downloadToken)}`;
}

const ALLOWED_IMAGE_MIME = /^(image\/(jpeg|jpg|png|webp|heic|heif))$/i;
const ALLOWED_VIDEO_MIME = /^(video\/(mp4|quicktime|x-m4v|mpeg))$/i;

function mimeAllowedForSlot(slot: "image" | "video", mimeType: string): boolean {
  return slot === "image" ? ALLOWED_IMAGE_MIME.test(mimeType) : ALLOWED_VIDEO_MIME.test(mimeType);
}

/**
 * POST /exercise-definitions/:exerciseId/media
 */
router.post(
  "/:exerciseId/media",
  asyncHandler(async (req: AuthedRequest, res: Response) => {
    const uid = req.uid;
    if (!uid) {
      emitMediaDiag(req, "uid_missing", { branch: "require_uid" });
      jsonError(req, res, 401, "UNAUTHORIZED", "Unauthorized");
      return;
    }

    const exerciseId = typeof req.params.exerciseId === "string" ? req.params.exerciseId.trim() : "";
    if (exerciseId.length === 0) {
      emitMediaDiag(req, "invalid_params", { reason: "empty_exercise_id" });
      jsonError(req, res, 400, "INVALID_PARAMS", "exerciseId is required");
      return;
    }

    if (!isUserScopedCustomExerciseId(uid, exerciseId)) {
      emitMediaDiag(req, "forbidden_exercise_id", { exerciseId, uidLen: uid.length });
      jsonError(req, res, 403, "FORBIDDEN", "Exercise id must be user-owned");
      return;
    }

    const parsedBody = exerciseDefinitionMediaUploadBodySchema.safeParse(req.body);
    if (!parsedBody.success) {
      emitMediaDiag(req, "invalid_body", { zod: parsedBody.error.flatten() });
      jsonError(req, res, 400, "INVALID_BODY", "Invalid request body", { details: parsedBody.error.flatten() });
      return;
    }

    const { slot, fileBase64, mimeType, filename } = parsedBody.data;
    if (!mimeAllowedForSlot(slot, mimeType)) {
      emitMediaDiag(req, "invalid_mime", { slot, mimeType });
      jsonError(req, res, 400, "INVALID_MIME", "MIME type not allowed for this slot");
      return;
    }

    const ref = userCollection(uid, "exerciseDefinitions").doc(exerciseId);
    /** Firestore doc read; typed minimally so routes do not import firebase-admin/firestore (CHECK 9). */
    let snap: { exists: boolean };
    try {
      snap = await ref.get();
    } catch (err: unknown) {
      const internal = err instanceof Error ? err.message : String(err);
      emitMediaDiag(req, "firestore_read_failed", { exerciseId, internal });
      jsonError(req, res, 500, "FIRESTORE_READ_FAILED", "Could not load exercise definition");
      return;
    }

    if (!snap.exists) {
      emitMediaDiag(req, "definition_not_found", { exerciseId });
      jsonError(req, res, 404, "NOT_FOUND", "Exercise definition not found");
      return;
    }

    let buffer: Buffer;
    try {
      buffer = Buffer.from(fileBase64, "base64");
    } catch (err: unknown) {
      const internal = err instanceof Error ? err.message : String(err);
      emitMediaDiag(req, "invalid_base64", { internal });
      jsonError(req, res, 400, "INVALID_BASE64", "fileBase64 is not valid base64");
      return;
    }

    const maxBytes = slot === "image" ? 12 * 1024 * 1024 : 28 * 1024 * 1024;
    if (buffer.length === 0) {
      emitMediaDiag(req, "empty_file", { slot });
      jsonError(req, res, 400, "EMPTY_FILE", "Empty upload");
      return;
    }
    if (buffer.length > maxBytes) {
      emitMediaDiag(req, "file_too_large", { slot, size: buffer.length, maxBytes });
      res.status(413).json({
        ok: false,
        error: {
          code: "FILE_TOO_LARGE",
          message: `File exceeds limit of ${maxBytes} bytes`,
          requestId: getRequestId(req),
          ...tracePart(req),
        },
      });
      return;
    }

    let bucket: string;
    try {
      bucket = requireFirebaseStorageBucketId();
    } catch (err: unknown) {
      const internal = err instanceof Error ? err.message : String(err);
      emitMediaDiag(req, "storage_bucket_missing", { internal });
      jsonError(req, res, 500, "STORAGE_CONFIG", "Exercise media upload is temporarily unavailable");
      return;
    }

    const safeName = safeExerciseMediaFilename(filename);
    const objectPath = `users/${uid}/exercise-media/${exerciseId}/${slot}-${randomUUID()}-${safeName}`;
    const downloadToken = randomUUID();

    let fileRef: { save: (data: Buffer, opts: Record<string, unknown>) => Promise<void> };
    try {
      const storage = admin.storage();
      if (!storage) {
        emitMediaDiag(req, "storage_admin_null", {});
        jsonError(req, res, 500, "STORAGE_INIT_FAILED", "Could not upload exercise media");
        return;
      }
      fileRef = storage.bucket(bucket).file(objectPath);
    } catch (err: unknown) {
      const internal = err instanceof Error ? err.message : String(err);
      emitMediaDiag(req, "storage_init_failed", { bucket, internal });
      jsonError(req, res, 500, "STORAGE_INIT_FAILED", "Could not upload exercise media");
      return;
    }

    try {
      await fileRef.save(buffer, {
        resumable: false,
        contentType: mimeType,
        metadata: {
          metadata: {
            firebaseStorageDownloadTokens: downloadToken,
            uid,
            exerciseId,
            slot,
          },
        },
      });
    } catch (err: unknown) {
      const internal = err instanceof Error ? err.message : String(err);
      emitMediaDiag(req, "storage_upload_failed", { exerciseId, slot, bucket, objectPath, internal });
      logger.error({
        msg: "exercise_definition_media_upload_failed",
        rid: getRequestId(req),
        exerciseId,
        slot,
        message: internal,
      });
      jsonError(req, res, 500, "STORAGE_UPLOAD_FAILED", "Could not upload exercise media");
      return;
    }

    let url: string;
    try {
      url = buildFirebaseDownloadUrl(bucket, objectPath, downloadToken);
    } catch (err: unknown) {
      const internal = err instanceof Error ? err.message : String(err);
      emitMediaDiag(req, "download_url_build_failed", { bucket, objectPath, internal });
      jsonError(req, res, 500, "DOWNLOAD_URL_FAILED", "Could not finalize exercise media upload");
      return;
    }

    const parsedOut = exerciseDefinitionMediaUploadResponseSchema.safeParse({ url, slot });
    if (!parsedOut.success) {
      emitMediaDiag(req, "response_validation_failed", {
        zod: parsedOut.error.flatten(),
        urlLen: url.length,
      });
      jsonError(req, res, 500, "MEDIA_RESPONSE_INVALID", "Could not finalize exercise media upload");
      return;
    }

    res.status(200).json(parsedOut.data);
  }),
);

export default router;
