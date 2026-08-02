/**
 * Document Ingestion OS routes — /users/me/documents/*
 * Authenticated, user-scoped. No public storage URLs. No health values in logs.
 */
import { Router, type Response } from "express";
import crypto from "crypto";
import { z } from "zod";
import {
  DOCUMENT_SCHEMA_VERSION,
  documentCompleteUploadRequestDtoSchema,
  documentCompleteUploadResponseDtoSchema,
  documentDeleteResponseDtoSchema,
  documentDetailResponseDtoSchema,
  documentDomainSchema,
  documentReprocessRequestDtoSchema,
  documentReprocessResponseDtoSchema,
  documentUploadIntentRequestDtoSchema,
  documentUploadIntentResponseDtoSchema,
  documentsListResponseDtoSchema,
  documentViewOriginalResponseDtoSchema,
  labUploadDtoSchema,
  userDocumentRecordSchema,
  type DocumentIngestionJob,
  type LabUploadDto,
  type UserDocumentRecord,
} from "@oli/contracts";

import type { AuthedRequest } from "../middleware/auth";
import { asyncHandler } from "../lib/asyncHandler";
import type { RequestWithRid } from "../lib/logger";
import { userCollection } from "../db";
import { requireFirebaseStorageBucketId } from "../lib/firebaseStorageBucketId";
import {
  DOCUMENT_ALLOWED_MEDIA_TYPES,
  DOCUMENT_MAX_BYTE_SIZE,
  validateDocumentUpload,
} from "../../../../lib/data/documents/documentValidation";
import { defaultDocumentTypeForDomain } from "../../../../lib/data/documents/documentTypes";
import { buildDocumentStorageObjectId } from "../../../../lib/data/documents/documentStorage";
import {
  mapLegacyLabUploadToDetail,
  mapLegacyLabUploadToListItem,
  parseLegacyLabDocumentId,
} from "../../../../lib/data/documents/mapLegacyLabUpload";
import {
  createIngestionJobRecord,
  runDocumentIngestionJob,
} from "../lib/documents/runDocumentIngestion";
import {
  logDocumentIngestionEvent,
  redactedDocumentToken,
} from "../lib/documents/documentIngestionTelemetry";
import {
  deleteDocumentOsRecord,
  deleteLegacyLabRecord,
  type DeleteDocumentLifecycleDeps,
} from "../lib/documents/deleteDocumentLifecycle";
import {
  safeWarningsForStatus,
  toDocumentDetailDto,
  toDocumentListItemDto,
} from "../lib/documents/toSafeDocumentDto";
import { transitionDocumentIngestionJobState } from "../../../../lib/data/documents/documentStateMachine";
import { reconcileDocumentProcessingStatus } from "../../../../lib/data/documents/documentProcessingReconcile";

function getAdmin() {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  return require("../firebaseAdmin").admin as typeof import("../firebaseAdmin").admin;
}

const router = Router();

const getRid = (req: AuthedRequest): string => (req as RequestWithRid).rid ?? "unknown";

const getIdempotencyKey = (req: AuthedRequest): string | undefined => {
  const fromHeader =
    (typeof req.header("Idempotency-Key") === "string" ? req.header("Idempotency-Key") : undefined) ??
    (typeof req.header("X-Idempotency-Key") === "string" ? req.header("X-Idempotency-Key") : undefined);
  return fromHeader ?? undefined;
};

const documentIdParamsSchema = z.object({ documentId: z.string().min(1) });

function toIsoFromTimestampLike(value: unknown): string | undefined {
  if (typeof value === "string") return value;
  if (value && typeof value === "object" && "toDate" in value) {
    const d = (value as { toDate: () => Date }).toDate();
    return d.toISOString();
  }
  return undefined;
}

async function writeDocumentBytes(args: {
  bucket: string;
  objectPath: string;
  mimeType: string;
  bytes: Buffer;
  metadata: Record<string, string>;
}): Promise<void> {
  const bucketRef = getAdmin().storage().bucket(args.bucket);
  const fileRef = bucketRef.file(args.objectPath);
  await fileRef.save(args.bytes, {
    resumable: false,
    contentType: args.mimeType,
    metadata: { metadata: args.metadata },
    preconditionOpts: { ifGenerationMatch: 0 },
  });
}

async function deleteDocumentBytes(args: { bucket: string; objectPath: string }): Promise<{ ok: true } | { ok: false }> {
  const bucketRef = getAdmin().storage().bucket(args.bucket);
  const fileRef = bucketRef.file(args.objectPath);
  try {
    await fileRef.delete({ ignoreNotFound: true });
    return { ok: true };
  } catch {
    return { ok: false };
  }
}

function parseUserDocument(raw: Record<string, unknown>, id: string): UserDocumentRecord | null {
  const uploadedAt = toIsoFromTimestampLike(raw.uploadedAt) ?? (raw.uploadedAt as string);
  const createdAt = toIsoFromTimestampLike(raw.createdAt) ?? (raw.createdAt as string);
  const updatedAt = toIsoFromTimestampLike(raw.updatedAt) ?? (raw.updatedAt as string);
  const validated = userDocumentRecordSchema.safeParse({
    ...raw,
    id,
    uploadedAt,
    createdAt,
    updatedAt,
  });
  return validated.success ? validated.data : null;
}

function documentsDeps(uid: string) {
  let bucket: string | null = null;
  try {
    bucket = requireFirebaseStorageBucketId();
  } catch {
    bucket = null;
  }
  return {
    documentsCol: userCollection(uid, "documents") as never,
    jobsCol: userCollection(uid, "documentIngestionJobs") as never,
    extractionsCol: userCollection(uid, "documentExtractions") as never,
    labDraftsCol: userCollection(uid, "labExtractionDrafts") as never,
    labReviewsCol: userCollection(uid, "labReviews") as never,
    labUploadsCol: userCollection(uid, "labUploads") as never,
    labAcceptedResultsCol: userCollection(uid, "labAcceptedResults") as never,
    labResultsCol: userCollection(uid, "labResults") as never,
    readDocumentBytes: async (storageObjectId: string): Promise<Uint8Array> => {
      if (!bucket) throw new Error("STORAGE_BUCKET_MISSING");
      const fileRef = getAdmin().storage().bucket(bucket).file(storageObjectId);
      const [buf] = await fileRef.download();
      return new Uint8Array(buf);
    },
  };
}

function deleteLifecycleDeps(uid: string): DeleteDocumentLifecycleDeps {
  let bucket: string | null = null;
  try {
    bucket = requireFirebaseStorageBucketId();
  } catch {
    bucket = null;
  }
  return {
    documentsCol: userCollection(uid, "documents") as never,
    jobsCol: userCollection(uid, "documentIngestionJobs") as never,
    extractionsCol: userCollection(uid, "documentExtractions") as never,
    labUploadsCol: userCollection(uid, "labUploads") as never,
    labResultsCol: userCollection(uid, "labResults") as never,
    labDraftsCol: userCollection(uid, "labExtractionDrafts") as never,
    labReviewsCol: userCollection(uid, "labReviews") as never,
    labAcceptedResultsCol: userCollection(uid, "labAcceptedResults") as never,
    parseUserDocument,
    deleteStorageObject: async (objectPath: string) => {
      if (!bucket) {
        // Config missing — treat as soft success only when path empty; otherwise fail closed.
        return objectPath.length === 0 ? { ok: true } : { ok: false };
      }
      return deleteDocumentBytes({ bucket, objectPath });
    },
  };
}

/** POST /users/me/documents/upload-intent */
router.post(
  "/upload-intent",
  asyncHandler(async (req: AuthedRequest, res: Response) => {
    const uid = req.uid;
    if (!uid) {
      res.status(401).json({ ok: false, error: "Unauthorized" });
      return;
    }

    const parsed = documentUploadIntentRequestDtoSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({
        ok: false,
        error: { code: "INVALID_BODY", requestId: getRid(req) },
      });
      return;
    }

    const body = parsed.data;
    const documentType = body.documentType ?? defaultDocumentTypeForDomain(body.domain);
    const validationInput: Parameters<typeof validateDocumentUpload>[0] = {
      authenticated: true,
      domain: body.domain,
      documentType,
      originalFilename: body.originalFilename,
      mediaType: body.mediaType,
      byteSize: body.byteSize,
    };
    if (body.checksumSha256) {
      validationInput.declaredChecksumSha256 = body.checksumSha256;
    }
    const validation = validateDocumentUpload(validationInput);

    if (!validation.ok) {
      res.status(400).json({
        ok: false,
        error: {
          code: validation.issues[0]?.code ?? "VALIDATION_FAILED",
          message: validation.issues[0]?.message ?? "Validation failed",
          requestId: getRid(req),
        },
      });
      return;
    }

    const now = new Date().toISOString();
    const docRef = userCollection(uid, "documents").doc();
    const storageObjectId = buildDocumentStorageObjectId({ userId: uid, documentId: docRef.id });

    // Placeholder record until complete-upload finalizes immutable identity fields.
    const placeholder: UserDocumentRecord = {
      schemaVersion: DOCUMENT_SCHEMA_VERSION,
      id: docRef.id,
      userId: uid,
      domain: body.domain,
      documentType,
      originalFilename: body.originalFilename,
      safeDisplayFilename: validation.safeDisplayFilename,
      mediaType: validation.mediaType,
      byteSize: body.byteSize,
      checksumSha256: body.checksumSha256 ?? "0".repeat(64),
      storageObjectId,
      uploadedAt: now,
      source: "user_upload",
      status: "uploading",
      retentionStatus: "active",
      createdAt: now,
      updatedAt: now,
    };

    await docRef.create(placeholder);

    const response = {
      ok: true as const,
      documentId: docRef.id,
      status: "uploading" as const,
      maxByteSize: DOCUMENT_MAX_BYTE_SIZE,
      allowedMediaTypes: [...DOCUMENT_ALLOWED_MEDIA_TYPES],
    };
    const validated = documentUploadIntentResponseDtoSchema.safeParse(response);
    if (!validated.success) {
      res.status(500).json({ ok: false, error: { code: "INTERNAL_CONTRACT_MISMATCH", requestId: getRid(req) } });
      return;
    }
    res.status(201).json(validated.data);
  }),
);

/** POST /users/me/documents/:documentId/complete-upload */
router.post(
  "/:documentId/complete-upload",
  asyncHandler(async (req: AuthedRequest, res: Response) => {
    const uid = req.uid;
    if (!uid) {
      res.status(401).json({ ok: false, error: "Unauthorized" });
      return;
    }

    const params = documentIdParamsSchema.safeParse(req.params);
    if (!params.success) {
      res.status(400).json({ ok: false, error: { code: "INVALID_PARAMS", requestId: getRid(req) } });
      return;
    }

    const parsed = documentCompleteUploadRequestDtoSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ ok: false, error: { code: "INVALID_BODY", requestId: getRid(req) } });
      return;
    }

    const { documentId } = params.data;
    const body = parsed.data;
    const docRef = userCollection(uid, "documents").doc(documentId);
    const existing = await docRef.get();
    if (!existing.exists) {
      res.status(404).json({ ok: false, error: { code: "NOT_FOUND", resource: "documents", id: documentId } });
      return;
    }

    const existingRecord = parseUserDocument(existing.data() as Record<string, unknown>, documentId);
    if (!existingRecord) {
      res.status(500).json({ ok: false, error: { code: "INTERNAL_CONTRACT_MISMATCH", requestId: getRid(req) } });
      return;
    }

    // Idempotent replay when already stored/processed.
    if (existingRecord.status !== "uploading") {
      const response = {
        ok: true as const,
        documentId,
        status: existingRecord.status,
        idempotentReplay: true as const,
      };
      const validated = documentCompleteUploadResponseDtoSchema.safeParse(response);
      if (!validated.success) {
        res.status(500).json({ ok: false, error: { code: "INTERNAL_CONTRACT_MISMATCH", requestId: getRid(req) } });
        return;
      }
      res.status(202).json(validated.data);
      return;
    }

    let buffer: Buffer;
    try {
      buffer = Buffer.from(body.fileBase64, "base64");
    } catch {
      res.status(400).json({ ok: false, error: { code: "INVALID_BASE64", requestId: getRid(req) } });
      return;
    }

    const checksumSha256 = crypto.createHash("sha256").update(buffer).digest("hex");
    const validationInput: Parameters<typeof validateDocumentUpload>[0] = {
      authenticated: true,
      domain: existingRecord.domain,
      documentType: existingRecord.documentType,
      originalFilename: body.originalFilename,
      mediaType: body.mediaType,
      byteSize: buffer.length,
      bytes: buffer,
      computedChecksumSha256: checksumSha256,
    };
    if (body.checksumSha256) {
      validationInput.declaredChecksumSha256 = body.checksumSha256;
    }
    const validation = validateDocumentUpload(validationInput);

    if (!validation.ok) {
      await docRef.update({
        status: "failed",
        updatedAt: new Date().toISOString(),
      });
      res.status(400).json({
        ok: false,
        error: {
          code: validation.issues[0]?.code ?? "VALIDATION_FAILED",
          message: validation.issues[0]?.message ?? "Validation failed",
          requestId: getRid(req),
        },
      });
      return;
    }

    // Duplicate detection (same user + checksum) — prefer existing durable record.
    const dupSnap = await userCollection(uid, "documents")
      .where("checksumSha256", "==", checksumSha256)
      .limit(20)
      .get();

    for (const doc of dupSnap.docs) {
      if (doc.id === documentId) continue;
      const dup = parseUserDocument(doc.data() as Record<string, unknown>, doc.id);
      if (!dup) continue;
      if (dup.status === "uploading" || dup.status === "failed") continue;

      // Cancel the placeholder intent; keep the existing document.
      await docRef.update({
        status: "failed",
        retentionStatus: "deleted",
        updatedAt: new Date().toISOString(),
      });

      const reprocessAvailable = dup.status === "unsupported";
      const response = {
        ok: true as const,
        documentId: dup.id,
        status: dup.status,
        duplicate: true,
        ...(reprocessAvailable ? { reprocessAvailable: true as const } : {}),
      };
      const validated = documentCompleteUploadResponseDtoSchema.safeParse(response);
      if (!validated.success) {
        res.status(500).json({ ok: false, error: { code: "INTERNAL_CONTRACT_MISMATCH", requestId: getRid(req) } });
        return;
      }
      res.status(202).json(validated.data);
      return;
    }

    let bucket: string;
    try {
      bucket = requireFirebaseStorageBucketId();
    } catch {
      res.status(500).json({
        ok: false,
        error: { code: "UPLOAD_STORAGE_CONFIG_MISSING", requestId: getRid(req) },
      });
      return;
    }

    const storageObjectId = buildDocumentStorageObjectId({ userId: uid, documentId });

    try {
      await writeDocumentBytes({
        bucket,
        objectPath: storageObjectId,
        mimeType: validation.mediaType,
        bytes: buffer,
        metadata: {
          documentId,
          // operational only — no original filename in object path
          sha256: checksumSha256,
          domain: existingRecord.domain,
        },
      });
    } catch {
      await docRef.update({ status: "failed", updatedAt: new Date().toISOString() });
      res.status(500).json({
        ok: false,
        error: { code: "UPLOAD_STORAGE_FAILED", requestId: getRid(req) },
      });
      return;
    }

    const now = new Date().toISOString();
    const stored: UserDocumentRecord = {
      ...existingRecord,
      originalFilename: body.originalFilename,
      safeDisplayFilename: validation.safeDisplayFilename,
      mediaType: validation.mediaType,
      byteSize: buffer.length,
      checksumSha256,
      storageObjectId,
      uploadedAt: now,
      status: "stored",
      retentionStatus: "active",
      updatedAt: now,
    };

    await docRef.set(stored);

    // Mirror labs domain into labUploads for backward-compatible Labs summary/list.
    if (stored.domain === "labs") {
      const labId = getIdempotencyKey(req) ?? documentId;
      const labRef = userCollection(uid, "labUploads").doc(labId);
      const labExisting = await labRef.get();
      if (!labExisting.exists) {
        const labDoc: LabUploadDto = {
          id: labId,
          fileName: stored.safeDisplayFilename,
          storagePath: storageObjectId,
          mimeType: stored.mediaType,
          uploadedAt: now,
          status: "unsupported",
          extractedCount: 0,
          matchedCount: 0,
          unmatchedCount: 0,
          errorMessage: "This report is stored, but structured extraction is not available yet.",
        };
        await labRef.create(labDoc);
        await docRef.update({ legacyLabUploadId: labId, updatedAt: now });
        stored.legacyLabUploadId = labId;
      }
    }

    const job = createIngestionJobRecord({ document: stored, now });
    const jobsCol = userCollection(uid, "documentIngestionJobs");
    await jobsCol.doc(job.id).set(job);

    // Advance job through validating → storing → stored, then async extract.
    let currentJob: DocumentIngestionJob = job;
    for (const next of ["validating", "storing", "stored"] as const) {
      const t = transitionDocumentIngestionJobState(currentJob.state, next);
      if (t.ok) {
        currentJob = {
          ...currentJob,
          state: next,
          updatedAt: now,
          stateHistory: [...currentJob.stateHistory, { state: next, at: now }],
        };
        await jobsCol.doc(job.id).set(currentJob);
      }
    }

    // Await ingestion in-request so Cloud Run CPU is not throttled mid-parse.
    const ingestStarted = Date.now();
    try {
      await runDocumentIngestionJob({
        deps: documentsDeps(uid),
        uid,
        document: stored,
        job: currentJob,
      });
    } catch {
      await docRef.update({ status: "failed", updatedAt: new Date().toISOString() });
    }

    const afterSnap = await docRef.get();
    const afterRecord = afterSnap.exists
      ? parseUserDocument(afterSnap.data() as Record<string, unknown>, documentId)
      : null;
    const terminalStatus = afterRecord?.status ?? "stored";
    logDocumentIngestionEvent("document_upload_completed", {
      documentToken: redactedDocumentToken(documentId),
      domain: stored.domain,
      terminalStatus,
      elapsedMs: Date.now() - ingestStarted,
      requestId: getRid(req),
      parserId: afterRecord?.parser?.id ?? null,
      parserVersion: afterRecord?.parser?.version ?? null,
    });

    const response = {
      ok: true as const,
      documentId,
      status: terminalStatus,
    };
    const validated = documentCompleteUploadResponseDtoSchema.safeParse(response);
    if (!validated.success) {
      res.status(500).json({ ok: false, error: { code: "INTERNAL_CONTRACT_MISMATCH", requestId: getRid(req) } });
      return;
    }
    res.status(202).json(validated.data);
  }),
);

/** GET /users/me/documents */
router.get(
  "/",
  asyncHandler(async (req: AuthedRequest, res: Response) => {
    const uid = req.uid;
    if (!uid) {
      res.status(401).json({ ok: false, error: "Unauthorized" });
      return;
    }

    const domainFilter = typeof req.query.domain === "string" ? req.query.domain : undefined;
    const domainParsed = domainFilter ? documentDomainSchema.safeParse(domainFilter) : null;
    if (domainFilter && !domainParsed?.success) {
      res.status(400).json({ ok: false, error: { code: "INVALID_DOMAIN", requestId: getRid(req) } });
      return;
    }

    const limitRaw = typeof req.query.limit === "string" ? Number(req.query.limit) : 50;
    const limit = Number.isFinite(limitRaw) ? Math.min(Math.max(Math.trunc(limitRaw), 1), 50) : 50;

    const snap = await userCollection(uid, "documents").orderBy("uploadedAt", "desc").limit(limit).get();
    const items = [];

    for (const doc of snap.docs) {
      const record = parseUserDocument(doc.data() as Record<string, unknown>, doc.id);
      if (!record) continue;
      if (record.retentionStatus === "deleted") continue;
      if (record.status === "uploading") continue;
      if (domainParsed?.success && record.domain !== domainParsed.data) continue;
      items.push(toDocumentListItemDto(record));
    }

    // Bridge legacy lab uploads when listing labs (or unfiltered).
    if (!domainParsed?.success || domainParsed.data === "labs") {
      const labsSnap = await userCollection(uid, "labUploads").orderBy("uploadedAt", "desc").limit(limit).get();
      // Only skip labUploads that are already mirrored by a Document OS record.
      // Do not seed this set with document ids — those are a different id space.
      const mirroredLegacyIds = new Set(
        snap.docs
          .map((d) => {
            const r = parseUserDocument(d.data() as Record<string, unknown>, d.id);
            return r?.legacyLabUploadId;
          })
          .filter((x): x is string => typeof x === "string"),
      );

      for (const doc of labsSnap.docs) {
        if (mirroredLegacyIds.has(doc.id)) continue;
        const raw = doc.data() as Record<string, unknown>;
        const uploadedAt = toIsoFromTimestampLike(raw.uploadedAt) ?? (raw.uploadedAt as string);
        const labDate = raw.labDate ? toIsoFromTimestampLike(raw.labDate) ?? (raw.labDate as string) : undefined;
        const validated = labUploadDtoSchema.safeParse({
          ...raw,
          id: doc.id,
          uploadedAt,
          ...(labDate ? { labDate } : {}),
        });
        if (!validated.success) continue;
        items.push(mapLegacyLabUploadToListItem(validated.data));
      }
    }

    items.sort((a, b) => String(b.uploadedAt).localeCompare(String(a.uploadedAt)));
    const page = items.slice(0, limit);

    const payload = { ok: true as const, items: page, nextCursor: null };
    const validated = documentsListResponseDtoSchema.safeParse(payload);
    if (!validated.success) {
      res.status(500).json({ ok: false, error: { code: "INTERNAL_CONTRACT_MISMATCH", requestId: getRid(req) } });
      return;
    }
    res.status(200).json(validated.data);
  }),
);

/** GET /users/me/documents/:documentId */
router.get(
  "/:documentId",
  asyncHandler(async (req: AuthedRequest, res: Response) => {
    const uid = req.uid;
    if (!uid) {
      res.status(401).json({ ok: false, error: "Unauthorized" });
      return;
    }

    const params = documentIdParamsSchema.safeParse(req.params);
    if (!params.success) {
      res.status(400).json({ ok: false, error: { code: "INVALID_PARAMS", requestId: getRid(req) } });
      return;
    }

    const { documentId } = params.data;
    const legacyLabId = parseLegacyLabDocumentId(documentId);
    if (legacyLabId) {
      const uploadSnap = await userCollection(uid, "labUploads").doc(legacyLabId).get();
      if (!uploadSnap.exists) {
        res.status(404).json({ ok: false, error: { code: "NOT_FOUND", resource: "documents", id: documentId } });
        return;
      }
      const raw = uploadSnap.data() as Record<string, unknown>;
      const uploadedAt = toIsoFromTimestampLike(raw.uploadedAt) ?? (raw.uploadedAt as string);
      const labDate = raw.labDate ? toIsoFromTimestampLike(raw.labDate) ?? (raw.labDate as string) : undefined;
      const validated = labUploadDtoSchema.safeParse({
        ...raw,
        id: uploadSnap.id,
        uploadedAt,
        ...(labDate ? { labDate } : {}),
      });
      if (!validated.success) {
        res.status(500).json({ ok: false, error: { code: "INTERNAL_CONTRACT_MISMATCH", requestId: getRid(req) } });
        return;
      }
      const detail = mapLegacyLabUploadToDetail(validated.data);
      const payload = { ok: true as const, document: detail };
      const out = documentDetailResponseDtoSchema.safeParse(payload);
      if (!out.success) {
        res.status(500).json({ ok: false, error: { code: "INTERNAL_CONTRACT_MISMATCH", requestId: getRid(req) } });
        return;
      }
      res.status(200).json(out.data);
      return;
    }

    const snap = await userCollection(uid, "documents").doc(documentId).get();
    if (!snap.exists) {
      res.status(404).json({ ok: false, error: { code: "NOT_FOUND", resource: "documents", id: documentId } });
      return;
    }

    const record = parseUserDocument(snap.data() as Record<string, unknown>, documentId);
    if (!record || record.retentionStatus === "deleted") {
      res.status(404).json({ ok: false, error: { code: "NOT_FOUND", resource: "documents", id: documentId } });
      return;
    }

    let processingState: DocumentIngestionJob["state"] | null = null;
    let jobUpdatedAt: string | null = null;
    const jobsSnap = await userCollection(uid, "documentIngestionJobs")
      .where("documentId", "==", documentId)
      .limit(10)
      .get();
    if (jobsSnap.docs.length > 0) {
      const jobs = jobsSnap.docs
        .map((d) => d.data() as DocumentIngestionJob)
        .sort((a, b) => String(b.updatedAt).localeCompare(String(a.updatedAt)));
      processingState = jobs[0]?.state ?? null;
      jobUpdatedAt = jobs[0]?.updatedAt ?? null;
    }

    let recordForDto = record;
    const reconciled = reconcileDocumentProcessingStatus({
      documentStatus: record.status,
      jobState: processingState,
      jobUpdatedAt,
    });
    if (reconciled.reason !== "unchanged" && reconciled.status !== record.status) {
      const now = new Date().toISOString();
      await userCollection(uid, "documents").doc(documentId).update({
        status: reconciled.status,
        updatedAt: now,
      });
      recordForDto = { ...record, status: reconciled.status, updatedAt: now };
    }

    type LabsImportSummaryFields = {
      importedCount: number;
      reviewNeededCount: number;
      unmatchedCount: number;
      reportImportStatus:
        | "imported"
        | "imported_review_recommended"
        | "review_needed"
        | "unsupported"
        | "failed"
        | "structured";
      hasAutoPublishedResults: boolean;
      hasReviewItems: boolean;
    };
    let importSummary: LabsImportSummaryFields | null = null;
    if (recordForDto.domain === "labs") {
      try {
        const reviewSnap = await userCollection(uid, "labReviews").doc(`review_${documentId}`).get();
        if (reviewSnap.exists) {
          const raw = reviewSnap.data() as Record<string, unknown>;
          const summaryRaw = raw.importSummary;
          if (summaryRaw && typeof summaryRaw === "object") {
            const summary = summaryRaw as Record<string, unknown>;
            const reportImportStatus = summary.reportImportStatus;
            if (
              typeof summary.importedCount === "number" &&
              typeof summary.reviewNeededCount === "number" &&
              typeof summary.unmatchedCount === "number" &&
              typeof reportImportStatus === "string" &&
              [
                "imported",
                "imported_review_recommended",
                "review_needed",
                "unsupported",
                "failed",
                "structured",
              ].includes(reportImportStatus)
            ) {
              importSummary = {
                importedCount: summary.importedCount,
                reviewNeededCount: summary.reviewNeededCount,
                unmatchedCount: summary.unmatchedCount,
                reportImportStatus: reportImportStatus as LabsImportSummaryFields["reportImportStatus"],
                hasAutoPublishedResults: summary.hasAutoPublishedResults === true,
                hasReviewItems: summary.hasReviewItems === true,
              };
            }
          }
        }
      } catch {
        importSummary = null;
      }
    }

    const detail = toDocumentDetailDto({
      record: recordForDto,
      processingState,
      safeWarnings: safeWarningsForStatus(recordForDto.status, undefined, importSummary),
      importSummary,
    });
    const payload = { ok: true as const, document: detail };
    const out = documentDetailResponseDtoSchema.safeParse(payload);
    if (!out.success) {
      res.status(500).json({ ok: false, error: { code: "INTERNAL_CONTRACT_MISMATCH", requestId: getRid(req) } });
      return;
    }
    res.status(200).json(out.data);
  }),
);

/** POST /users/me/documents/:documentId/reprocess */
router.post(
  "/:documentId/reprocess",
  asyncHandler(async (req: AuthedRequest, res: Response) => {
    const uid = req.uid;
    if (!uid) {
      res.status(401).json({ ok: false, error: "Unauthorized" });
      return;
    }

    const params = documentIdParamsSchema.safeParse(req.params);
    if (!params.success) {
      res.status(400).json({ ok: false, error: { code: "INVALID_PARAMS", requestId: getRid(req) } });
      return;
    }

    if (parseLegacyLabDocumentId(params.data.documentId)) {
      res.status(400).json({
        ok: false,
        error: { code: "LEGACY_REPROCESS_UNSUPPORTED", requestId: getRid(req) },
      });
      return;
    }

    const parsedBody = documentReprocessRequestDtoSchema.safeParse(req.body ?? {});
    if (!parsedBody.success) {
      res.status(400).json({ ok: false, error: { code: "INVALID_BODY", requestId: getRid(req) } });
      return;
    }

    const idempotencyKey = getIdempotencyKey(req);
    const { documentId } = params.data;
    const snap = await userCollection(uid, "documents").doc(documentId).get();
    if (!snap.exists) {
      res.status(404).json({ ok: false, error: { code: "NOT_FOUND", resource: "documents", id: documentId } });
      return;
    }
    const record = parseUserDocument(snap.data() as Record<string, unknown>, documentId);
    if (!record || record.retentionStatus === "deleted") {
      res.status(404).json({ ok: false, error: { code: "NOT_FOUND", resource: "documents", id: documentId } });
      return;
    }

    if (idempotencyKey) {
      const existingJob = await userCollection(uid, "documentIngestionJobs").doc(idempotencyKey).get();
      if (existingJob.exists) {
        const job = existingJob.data() as DocumentIngestionJob;
        const response = {
          ok: true as const,
          documentId,
          jobId: job.id,
          status: record.status,
          dryRun: Boolean(job.dryRun),
          idempotentReplay: true as const,
        };
        const validated = documentReprocessResponseDtoSchema.safeParse(response);
        if (!validated.success) {
          res.status(500).json({ ok: false, error: { code: "INTERNAL_CONTRACT_MISMATCH", requestId: getRid(req) } });
          return;
        }
        res.status(202).json(validated.data);
        return;
      }
    }

    const previousJobs = await userCollection(uid, "documentIngestionJobs")
      .where("documentId", "==", documentId)
      .limit(5)
      .get();
    const latest = previousJobs.docs
      .map((d) => d.data() as DocumentIngestionJob)
      .sort((a, b) => String(b.updatedAt).localeCompare(String(a.updatedAt)))[0];

    const jobArgs: Parameters<typeof createIngestionJobRecord>[0] = { document: record };
    if (parsedBody.data.dryRun != null) jobArgs.dryRun = parsedBody.data.dryRun;
    if (latest?.id) jobArgs.reprocessOfJobId = latest.id;
    if (parsedBody.data.parserId) jobArgs.parserId = parsedBody.data.parserId;
    const job = createIngestionJobRecord(jobArgs);
    const jobId = idempotencyKey ?? job.id;
    const jobRecord = { ...job, id: jobId };
    await userCollection(uid, "documentIngestionJobs").doc(jobId).set(jobRecord);

    await userCollection(uid, "documents").doc(documentId).update({
      status: "processing",
      updatedAt: new Date().toISOString(),
    });

    // Jump job to stored so orchestration can classify/extract.
    const primed: DocumentIngestionJob = {
      ...jobRecord,
      state: "stored",
      updatedAt: new Date().toISOString(),
      stateHistory: [
        ...jobRecord.stateHistory,
        { state: "validating", at: jobRecord.createdAt },
        { state: "storing", at: jobRecord.createdAt },
        { state: "stored", at: jobRecord.createdAt },
      ],
    };
    await userCollection(uid, "documentIngestionJobs").doc(jobId).set(primed);

    const runArgs: Parameters<typeof runDocumentIngestionJob>[0] = {
      deps: documentsDeps(uid),
      uid,
      document: record,
      job: primed,
    };
    if (parsedBody.data.parserId) runArgs.parserId = parsedBody.data.parserId;
    try {
      await runDocumentIngestionJob(runArgs);
    } catch {
      await userCollection(uid, "documents").doc(documentId).update({
        status: "failed",
        updatedAt: new Date().toISOString(),
      });
    }

    const afterSnap = await userCollection(uid, "documents").doc(documentId).get();
    const afterRecord = afterSnap.exists
      ? parseUserDocument(afterSnap.data() as Record<string, unknown>, documentId)
      : null;
    const terminalStatus = afterRecord?.status ?? "processing";

    const response = {
      ok: true as const,
      documentId,
      jobId,
      status: terminalStatus,
      dryRun: Boolean(parsedBody.data.dryRun),
    };
    const validated = documentReprocessResponseDtoSchema.safeParse(response);
    if (!validated.success) {
      res.status(500).json({ ok: false, error: { code: "INTERNAL_CONTRACT_MISMATCH", requestId: getRid(req) } });
      return;
    }
    res.status(202).json(validated.data);
  }),
);

/** DELETE /users/me/documents/:documentId — Document OS + bridged legacy Labs. */
router.delete(
  "/:documentId",
  asyncHandler(async (req: AuthedRequest, res: Response) => {
    const uid = req.uid;
    if (!uid) {
      res.status(401).json({ ok: false, error: "Unauthorized" });
      return;
    }

    const params = documentIdParamsSchema.safeParse(req.params);
    if (!params.success) {
      res.status(400).json({ ok: false, error: { code: "INVALID_PARAMS", requestId: getRid(req) } });
      return;
    }

    const { documentId } = params.data;
    const deps = deleteLifecycleDeps(uid);
    const legacyLabId = parseLegacyLabDocumentId(documentId);

    const result = legacyLabId
      ? await deleteLegacyLabRecord({ deps, labUploadId: legacyLabId })
      : await deleteDocumentOsRecord({ deps, documentId });

    if (!result.ok) {
      if (result.code === "NOT_FOUND") {
        res.status(404).json({
          ok: false,
          error: { code: "NOT_FOUND", resource: "documents", id: documentId },
        });
        return;
      }
      res.status(500).json({
        ok: false,
        error: { code: result.code, requestId: getRid(req) },
      });
      return;
    }

    const response = { ok: true as const, documentId: result.consumerDocumentId, deleted: true as const };
    const validated = documentDeleteResponseDtoSchema.safeParse(response);
    if (!validated.success) {
      res.status(500).json({ ok: false, error: { code: "INTERNAL_CONTRACT_MISMATCH", requestId: getRid(req) } });
      return;
    }
    res.status(200).json(validated.data);
  }),
);

/** GET /users/me/documents/:documentId/view-original — capability stub (no signed URL yet). */
router.get(
  "/:documentId/view-original",
  asyncHandler(async (req: AuthedRequest, res: Response) => {
    const uid = req.uid;
    if (!uid) {
      res.status(401).json({ ok: false, error: "Unauthorized" });
      return;
    }

    const params = documentIdParamsSchema.safeParse(req.params);
    if (!params.success) {
      res.status(400).json({ ok: false, error: { code: "INVALID_PARAMS", requestId: getRid(req) } });
      return;
    }

    // Authorize ownership without returning a URL.
    const legacyLabId = parseLegacyLabDocumentId(params.data.documentId);
    if (legacyLabId) {
      const uploadSnap = await userCollection(uid, "labUploads").doc(legacyLabId).get();
      if (!uploadSnap.exists) {
        res.status(404).json({ ok: false, error: { code: "NOT_FOUND", requestId: getRid(req) } });
        return;
      }
    } else {
      const snap = await userCollection(uid, "documents").doc(params.data.documentId).get();
      if (!snap.exists) {
        res.status(404).json({ ok: false, error: { code: "NOT_FOUND", requestId: getRid(req) } });
        return;
      }
    }

    const response = {
      ok: true as const,
      available: false as const,
      reasonCode: "VIEW_ORIGINAL_NOT_IMPLEMENTED" as const,
    };
    const validated = documentViewOriginalResponseDtoSchema.safeParse(response);
    if (!validated.success) {
      res.status(500).json({ ok: false, error: { code: "INTERNAL_CONTRACT_MISMATCH", requestId: getRid(req) } });
      return;
    }
    res.status(200).json(validated.data);
  }),
);

export default router;
