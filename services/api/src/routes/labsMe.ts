// services/api/src/routes/labsMe.ts
// GET/POST /users/me/labs/* — lab uploads + per-metric results (schema v2).
import { Router, type Response } from "express";
import crypto from "crypto";
import { z } from "zod";
import {
  createLabUploadRequestDtoSchema,
  createLabUploadResponseDtoSchema,
  labMetricDetailResponseDtoSchema,
  labMetricResultDtoSchema,
  labUploadDetailResponseDtoSchema,
  labUploadDtoSchema,
  labUploadsListResponseDtoSchema,
  acceptedLabResultSchema,
  labAnalyteHistoryDtoSchema,
  labsSummaryResponseDtoSchema,
  type AcceptedLabResult,
  type LabMetricResultDto,
  type LabUploadDto,
} from "@oli/contracts";
import {
  formatLabResultValue,
  getLabCategories,
  getLabMetricByKey,
  groupLabResultsByCategory,
} from "../../../../lib/labs/labMetricCatalog";
import { toHistoryPointDto } from "../../../../lib/labs/extraction/labHistoryCompatibility";
import { sortLabHistoryByCollectionDate } from "../../../../lib/labs/history/evaluateLabTrendEligibility";
import {
  calculateLabMetricChange,
  formatLabMetricChangeCopy,
} from "../../../../lib/labs/history/calculateLabMetricChange";
import {
  selectLabConsumerHistoryRows,
  selectLabConsumerLatestResult,
  type LabConsumerHistoryRow,
} from "../../../../lib/labs/integrity/filterLabHistoryForConsumer";

import type { AuthedRequest } from "../middleware/auth";
import { asyncHandler } from "../lib/asyncHandler";
import type { RequestWithRid } from "../lib/logger";
import { userCollection } from "../db";
import { requireFirebaseStorageBucketId } from "../lib/firebaseStorageBucketId";
import { mockParseLabPdf } from "../lib/labs/mockLabPdfParser";

function getAdmin() {
  // Lazy require keeps Jest from loading firebase-admin when labs routes are imported.
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

const uploadIdParamsSchema = z.object({ uploadId: z.string().min(1) });
const metricKeyParamsSchema = z.object({ metricKey: z.string().min(1) });
const historyQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(50).optional().default(20),
  cursor: z.string().min(1).optional(),
});

function resultFingerprint(result: AcceptedLabResult["result"]): string {
  if (result.kind === "numeric") return `${result.comparator}:${result.value}`;
  if (result.kind === "not_reported") return `nr:${result.reason}`;
  return `${result.kind}:${result.value}`;
}

function measuredOrCalculatedFromAccepted(
  row: AcceptedLabResult,
): "measured" | "calculated" | "reported_unknown" {
  if (row.method?.calculated === true) return "calculated";
  if (row.method?.calculated === false) return "measured";
  return "reported_unknown";
}

function acceptedToConsumerHistoryRow(row: AcceptedLabResult, metricKey: string): LabConsumerHistoryRow {
  let rawValueText: string | null = null;
  if (row.result.kind === "numeric") {
    const v = String(row.result.value);
    if (row.result.comparator === "lt") rawValueText = `<${v}`;
    else if (row.result.comparator === "lte") rawValueText = `<=${v}`;
    else if (row.result.comparator === "gt") rawValueText = `>${v}`;
    else if (row.result.comparator === "gte") rawValueText = `>=${v}`;
    else rawValueText = v;
  } else if (row.result.kind === "pattern" || row.result.kind === "qualitative" || row.result.kind === "text") {
    rawValueText = String(row.result.value);
  }
  return {
    id: row.id,
    canonicalMetricId: row.canonicalMetricId ?? metricKey,
    collectedAt: row.collectedAt,
    panelId: row.panelId,
    specimenType: row.specimen?.type ?? null,
    methodId: row.method?.assayMethod ?? null,
    measuredOrCalculated: measuredOrCalculatedFromAccepted(row),
    sourceLocator: row.provenance.sourceLocator,
    sourcePage: row.provenance.sourcePage,
    sourceDocumentId: row.sourceDocumentId ?? null,
    sourceValueRole: row.provenance.sourceValueRole ?? null,
    reviewStatus: row.review?.status ?? null,
    result: row.result,
    rawValueText,
    resultFingerprint: resultFingerprint(row.result),
  };
}

function projectionToConsumerHistoryRow(row: LabMetricResultDto): LabConsumerHistoryRow {
  const cmp =
    typeof row.value === "number"
      ? row.rawValueText && /^[<>]/.test(row.rawValueText.trim())
        ? row.rawValueText.trim().startsWith("<")
          ? "lt"
          : "gt"
        : "eq"
      : null;
  return {
    id: row.id,
    canonicalMetricId: row.metricKey,
    collectedAt: row.collectedAt ?? null,
    panelId: row.panelName ?? null,
    panelName: row.panelName ?? null,
    specimenType: null,
    sourcePage: typeof row.sourcePage === "number" ? row.sourcePage : null,
    sourceDocumentId: row.uploadId ?? (row as { sourceDocumentId?: string }).sourceDocumentId ?? null,
    sourceValueRole: row.sourceValueRole ?? null,
    reviewStatus: row.publicationMode ?? null,
    result:
      typeof row.value === "number"
        ? { kind: "numeric", value: row.value, comparator: cmp ?? "eq" }
        : row.value != null
          ? { kind: "text", value: String(row.value) }
          : null,
    rawValueText: row.rawValueText ?? null,
    resultFingerprint: `${row.value ?? ""}:${row.rawValueText ?? ""}:${row.unit ?? ""}`,
  };
}

function computeMetricSummaryExtras(
  metricKey: string,
  results: LabMetricResultDto[],
): { historyPointCount?: number; neutralChangeSummary?: string } {
  const withDate = results.filter((r) => r.metricKey === metricKey && r.collectedAt);
  if (withDate.length === 0) return {};
  const sorted = [...withDate].sort((a, b) =>
    String(b.collectedAt ?? "").localeCompare(String(a.collectedAt ?? "")),
  );
  const latest = sorted[0]!;
  const prior = sorted.find((row, idx) => {
    if (idx === 0) return false;
    if (row.value == null || latest.value == null) return false;
    if (!row.collectedAt || !latest.collectedAt) return false;
    if ((row.unit ?? "") !== (latest.unit ?? "")) return false;
    const raw = row.rawValueText ?? "";
    const latestRaw = latest.rawValueText ?? "";
    if (/^[<>≤≥]/.test(raw) || /^[<>≤≥]/.test(latestRaw)) return false;
    return true;
  });
  const extras: { historyPointCount?: number; neutralChangeSummary?: string } = {
    historyPointCount: withDate.length,
  };
  if (
    prior &&
    latest.value != null &&
    prior.value != null &&
    latest.collectedAt &&
    prior.collectedAt
  ) {
    const change = calculateLabMetricChange({
      latest: {
        id: latest.id,
        collectedAt: latest.collectedAt,
        result: { kind: "numeric", value: latest.value, comparator: "eq" },
      },
      prior: {
        id: prior.id,
        collectedAt: prior.collectedAt,
        result: { kind: "numeric", value: prior.value, comparator: "eq" },
      },
    });
    if (change) {
      extras.neutralChangeSummary = formatLabMetricChangeCopy({
        change,
        unit: latest.unit ?? null,
      });
    }
  }
  return extras;
}

function toIsoFromTimestampLike(value: unknown): string | undefined {
  if (typeof value === "string") return value;
  if (value && typeof value === "object" && "toDate" in value) {
    const d = (value as { toDate: () => Date }).toDate();
    return d.toISOString();
  }
  return undefined;
}

async function writeLabPdfToStorage(args: {
  bucket: string;
  objectPath: string;
  mimeType: string;
  bytes: Buffer;
  metadata: Record<string, string>;
}): Promise<{ bucket: string; objectPath: string }> {
  const bucketRef = getAdmin().storage().bucket(args.bucket);
  const fileRef = bucketRef.file(args.objectPath);
  await fileRef.save(args.bytes, {
    resumable: false,
    contentType: args.mimeType,
    metadata: { metadata: args.metadata },
    preconditionOpts: { ifGenerationMatch: 0 },
  });
  return { bucket: args.bucket, objectPath: args.objectPath };
}

async function loadMetricResults(uid: string): Promise<LabMetricResultDto[]> {
  // Equality-only query avoids a composite index (schemaVersion + createdAt).
  // Sort newest-first in memory so zero-record and populated users both succeed.
  const snap = await userCollection(uid, "labResults").where("schemaVersion", "==", 2).limit(500).get();

  const items: LabMetricResultDto[] = [];
  for (const doc of snap.docs) {
    const raw = doc.data() as Record<string, unknown>;
    const createdAt = toIsoFromTimestampLike(raw.createdAt) ?? (raw.createdAt as string);
    const normalized = { ...raw, id: doc.id, createdAt };
    const validated = labMetricResultDtoSchema.safeParse(normalized);
    if (validated.success) items.push(validated.data);
  }

  items.sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt)));
  return items;
}

/**
 * Post-upload processing — fail closed when structured extraction is unavailable.
 * Must never write mock biomarkers into labResults.
 */
async function runLabUploadPostProcess(uid: string, uploadId: string, fileName: string): Promise<void> {
  const uploadsCol = userCollection(uid, "labUploads");
  const uploadRef = uploadsCol.doc(uploadId);
  const now = new Date().toISOString();

  await uploadRef.update({ status: "processing" });

  const outcome = mockParseLabPdf({ uploadId, fileName, now });

  await uploadRef.update({
    status: outcome.status,
    extractedCount: 0,
    matchedCount: 0,
    unmatchedCount: 0,
    errorMessage: outcome.userMessage,
    updatedAt: now,
  });
}

router.get(
  "/summary",
  asyncHandler(async (req: AuthedRequest, res: Response) => {
    const uid = req.uid;
    if (!uid) {
      res.status(401).json({ ok: false, error: "Unauthorized" });
      return;
    }

    const [results, uploadsSnap] = await Promise.all([
      loadMetricResults(uid),
      userCollection(uid, "labUploads").get(),
    ]);

    const grouped = groupLabResultsByCategory(
      results.map((r) => ({
        id: r.id,
        metricKey: r.metricKey,
        categoryKey: r.categoryKey,
        displayName: r.displayName,
        value: r.value,
        unit: r.unit,
        referenceRangeLow: r.referenceRangeLow ?? null,
        referenceRangeHigh: r.referenceRangeHigh ?? null,
        referenceRangeText: r.referenceRangeText ?? null,
        flag: r.flag ?? null,
        collectedAt: r.collectedAt ?? null,
        reportedAt: r.reportedAt ?? null,
        uploadId: r.uploadId,
        rawValueText: r.rawValueText ?? null,
        panelName: r.panelName ?? null,
        ...(typeof r.sourcePage === "number" ? { sourcePage: r.sourcePage } : {}),
        sourceValueRole: r.sourceValueRole ?? null,
        publicationMode: r.publicationMode ?? null,
      })),
    );
    const categories = grouped.map((g) => ({
      categoryKey: g.category.categoryKey,
      displayName: g.category.displayName,
      metrics: g.metrics.map((m) => ({
        metricKey: m.definition.metricKey,
        displayName: m.definition.displayName,
        latestValueText: formatLabResultValue(m.latest?.value, m.latest?.unit ?? m.definition.preferredUnit, {
          preferredUnit: m.definition.preferredUnit,
          ...(m.latest?.rawValueText !== undefined ? { rawValueText: m.latest.rawValueText } : {}),
        }),
        ...(m.latest?.flag != null ? { flag: m.latest.flag } : {}),
        ...(m.latest?.collectedAt != null ? { collectedAt: m.latest.collectedAt } : {}),
        ...(m.latest?.uploadId != null ? { uploadId: m.latest.uploadId } : {}),
        ...computeMetricSummaryExtras(m.definition.metricKey, results),
      })),
    }));

    const payload = {
      ok: true as const,
      categories,
      uploadCount: uploadsSnap.size,
    };

    const validated = labsSummaryResponseDtoSchema.safeParse(payload);
    if (!validated.success) {
      res.status(500).json({
        ok: false,
        error: { code: "INTERNAL_CONTRACT_MISMATCH", requestId: getRid(req) },
      });
      return;
    }

    res.status(200).json(validated.data);
  }),
);

router.get(
  "/uploads",
  asyncHandler(async (req: AuthedRequest, res: Response) => {
    const uid = req.uid;
    if (!uid) {
      res.status(401).json({ ok: false, error: "Unauthorized" });
      return;
    }

    const snap = await userCollection(uid, "labUploads").orderBy("uploadedAt", "desc").limit(50).get();
    const items: LabUploadDto[] = [];

    for (const doc of snap.docs) {
      const raw = doc.data() as Record<string, unknown>;
      const uploadedAt = toIsoFromTimestampLike(raw.uploadedAt) ?? (raw.uploadedAt as string);
      const labDate = raw.labDate ? toIsoFromTimestampLike(raw.labDate) ?? (raw.labDate as string) : undefined;
      const normalized = {
        ...raw,
        id: doc.id,
        uploadedAt,
        ...(labDate ? { labDate } : {}),
      };
      const validated = labUploadDtoSchema.safeParse(normalized);
      if (validated.success) items.push(validated.data);
    }

    const payload = { ok: true as const, items, nextCursor: null };
    const validated = labUploadsListResponseDtoSchema.safeParse(payload);
    if (!validated.success) {
      res.status(500).json({ ok: false, error: { code: "INTERNAL_CONTRACT_MISMATCH", requestId: getRid(req) } });
      return;
    }

    res.status(200).json(validated.data);
  }),
);

router.post(
  "/uploads",
  asyncHandler(async (req: AuthedRequest, res: Response) => {
    const uid = req.uid;
    if (!uid) {
      res.status(401).json({ ok: false, error: "Unauthorized" });
      return;
    }

    const idempotencyKey = getIdempotencyKey(req);
    if (!idempotencyKey) {
      res.status(400).json({
        ok: false,
        error: {
          code: "MISSING_IDEMPOTENCY_KEY",
          message: "Idempotency-Key header is required for lab upload",
          requestId: getRid(req),
        },
      });
      return;
    }

    const parsed = createLabUploadRequestDtoSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({
        ok: false,
        error: {
          code: "INVALID_BODY",
          message: "Invalid request body",
          details: parsed.error.flatten(),
          requestId: getRid(req),
        },
      });
      return;
    }

    const body = parsed.data;
    const uploadsCol = userCollection(uid, "labUploads");
    const docRef = uploadsCol.doc(idempotencyKey);
    const existing = await docRef.get();

    if (existing.exists) {
      const data = existing.data() as LabUploadDto;
      res.status(202).json({
        ok: true as const,
        id: docRef.id,
        status: data.status,
        idempotentReplay: true as const,
      });
      return;
    }

    let buffer: Buffer;
    try {
      buffer = Buffer.from(body.fileBase64, "base64");
    } catch {
      res.status(400).json({ ok: false, error: { code: "INVALID_BASE64", requestId: getRid(req) } });
      return;
    }

    if (buffer.length === 0) {
      res.status(400).json({ ok: false, error: { code: "EMPTY_FILE", requestId: getRid(req) } });
      return;
    }

    const fileHash = crypto.createHash("sha256").update(buffer).digest("hex");
    const safeName = body.fileName.replace(/[/\\]/g, "_");
    const objectPath = `lab-uploads/${uid}/${fileHash}/${safeName}`;

    let bucket: string;
    try {
      bucket = requireFirebaseStorageBucketId();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Unknown configuration error";
      res.status(500).json({
        ok: false,
        error: { code: "UPLOAD_STORAGE_CONFIG_MISSING", message, requestId: getRid(req) },
      });
      return;
    }

    try {
      await writeLabPdfToStorage({
        bucket,
        objectPath,
        mimeType: body.mimeType,
        bytes: buffer,
        metadata: { uid, uploadId: docRef.id, sha256: fileHash, originalFilename: body.fileName },
      });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Unknown storage error";
      res.status(500).json({
        ok: false,
        error: { code: "UPLOAD_STORAGE_FAILED", message, requestId: getRid(req) },
      });
      return;
    }

    const now = new Date().toISOString();
    const uploadDoc: LabUploadDto = {
      id: docRef.id,
      fileName: body.fileName,
      storagePath: objectPath,
      mimeType: body.mimeType,
      uploadedAt: now,
      ...(body.labDate ? { labDate: body.labDate } : {}),
      ...(body.reportSource ? { reportSource: body.reportSource } : {}),
      status: "uploaded",
      extractedCount: 0,
      matchedCount: 0,
      unmatchedCount: 0,
    };

    await docRef.create(uploadDoc);

    // Structured extraction is fail-closed until a real parser ships.
    void runLabUploadPostProcess(uid, docRef.id, body.fileName).catch(() => {
      void docRef.update({
        status: "failed",
        errorMessage: "Processing failed",
      });
    });

    const response = { ok: true as const, id: docRef.id, status: "uploaded" as const };
    const validated = createLabUploadResponseDtoSchema.safeParse(response);
    if (!validated.success) {
      res.status(500).json({ ok: false, error: { code: "INTERNAL_CONTRACT_MISMATCH", requestId: getRid(req) } });
      return;
    }

    res.status(202).json(validated.data);
  }),
);

router.get(
  "/uploads/:uploadId",
  asyncHandler(async (req: AuthedRequest, res: Response) => {
    const uid = req.uid;
    if (!uid) {
      res.status(401).json({ ok: false, error: "Unauthorized" });
      return;
    }

    const parsedParams = uploadIdParamsSchema.safeParse(req.params);
    if (!parsedParams.success) {
      res.status(400).json({ ok: false, error: { code: "INVALID_PARAMS", requestId: getRid(req) } });
      return;
    }

    const { uploadId } = parsedParams.data;
    const uploadSnap = await userCollection(uid, "labUploads").doc(uploadId).get();
    if (!uploadSnap.exists) {
      res.status(404).json({ ok: false, error: { code: "NOT_FOUND", resource: "labUploads", id: uploadId } });
      return;
    }

    const raw = uploadSnap.data() as Record<string, unknown>;
    const uploadedAt = toIsoFromTimestampLike(raw.uploadedAt) ?? (raw.uploadedAt as string);
    const labDate = raw.labDate ? toIsoFromTimestampLike(raw.labDate) ?? (raw.labDate as string) : undefined;
    const uploadValidated = labUploadDtoSchema.safeParse({
      ...raw,
      id: uploadSnap.id,
      uploadedAt,
      ...(labDate ? { labDate } : {}),
    });

    if (!uploadValidated.success) {
      res.status(500).json({ ok: false, error: { code: "INTERNAL_CONTRACT_MISMATCH", requestId: getRid(req) } });
      return;
    }

    const resultsSnap = await userCollection(uid, "labResults")
      .where("uploadId", "==", uploadId)
      .where("schemaVersion", "==", 2)
      .get();

    const allResults: LabMetricResultDto[] = [];
    for (const doc of resultsSnap.docs) {
      const r = doc.data() as Record<string, unknown>;
      const createdAt = toIsoFromTimestampLike(r.createdAt) ?? (r.createdAt as string);
      const validated = labMetricResultDtoSchema.safeParse({ ...r, id: doc.id, createdAt });
      if (validated.success) allResults.push(validated.data);
    }

    const matched = allResults.filter((r) => r.categoryKey !== "unmatched");
    const unmatchedResults = allResults.filter((r) => r.categoryKey === "unmatched");

    const resultsByCategory = getLabCategories()
      .map((category) => ({
        categoryKey: category.categoryKey,
        displayName: category.displayName,
        results: matched.filter((r) => r.categoryKey === category.categoryKey),
      }))
      .filter((g) => g.results.length > 0);

    const payload = {
      ok: true as const,
      upload: uploadValidated.data,
      resultsByCategory,
      unmatchedResults,
      pdfUrl: null,
    };

    const validated = labUploadDetailResponseDtoSchema.safeParse(payload);
    if (!validated.success) {
      res.status(500).json({ ok: false, error: { code: "INTERNAL_CONTRACT_MISMATCH", requestId: getRid(req) } });
      return;
    }

    res.status(200).json(validated.data);
  }),
);

router.get(
  "/metrics/:metricKey",
  asyncHandler(async (req: AuthedRequest, res: Response) => {
    const uid = req.uid;
    if (!uid) {
      res.status(401).json({ ok: false, error: "Unauthorized" });
      return;
    }

    const parsedParams = metricKeyParamsSchema.safeParse(req.params);
    if (!parsedParams.success) {
      res.status(400).json({ ok: false, error: { code: "INVALID_PARAMS", requestId: getRid(req) } });
      return;
    }

    const { metricKey } = parsedParams.data;
    const catalog = getLabMetricByKey(metricKey);
    if (!catalog) {
      res.status(404).json({ ok: false, error: { code: "NOT_FOUND", resource: "labMetric", id: metricKey } });
      return;
    }

    const snap = await userCollection(uid, "labResults")
      .where("metricKey", "==", metricKey)
      .where("schemaVersion", "==", 2)
      .limit(50)
      .get();

    const loaded: LabMetricResultDto[] = [];
    for (const doc of snap.docs) {
      const r = doc.data() as Record<string, unknown>;
      const createdAt = toIsoFromTimestampLike(r.createdAt) ?? (r.createdAt as string);
      const validated = labMetricResultDtoSchema.safeParse({ ...r, id: doc.id, createdAt });
      if (validated.success) loaded.push(validated.data);
    }
    const byId = new Map(loaded.map((r) => [r.id, r]));
    const consumerRows = loaded.map(projectionToConsumerHistoryRow);
    const historyIds = selectLabConsumerHistoryRows(consumerRows).map((r) => r.id);
    const history = historyIds
      .map((id) => byId.get(id))
      .filter((r): r is LabMetricResultDto => r != null)
      .sort((a, b) => String(b.collectedAt ?? "").localeCompare(String(a.collectedAt ?? "")));
    const latestId = selectLabConsumerLatestResult(consumerRows)?.id ?? null;
    const latest = (latestId ? byId.get(latestId) : null) ?? history[0] ?? null;
    const payload = {
      ok: true as const,
      metricKey: catalog.metricKey,
      displayName: catalog.displayName,
      categoryKey: catalog.categoryKey,
      preferredUnit: catalog.preferredUnit,
      latest,
      history,
      referenceRangeText: latest?.referenceRangeText ?? null,
    };

    const validated = labMetricDetailResponseDtoSchema.safeParse(payload);
    if (!validated.success) {
      res.status(500).json({ ok: false, error: { code: "INTERNAL_CONTRACT_MISMATCH", requestId: getRid(req) } });
      return;
    }

    res.status(200).json(validated.data);
  }),
);

/**
 * Bounded accepted-result history for a canonical metric.
 * Ordered by collectedAt desc; cursor is the last returned accepted result id.
 */
router.get(
  "/metrics/:metricKey/history",
  asyncHandler(async (req: AuthedRequest, res: Response) => {
    const uid = req.uid;
    if (!uid) {
      res.status(401).json({ ok: false, error: "Unauthorized" });
      return;
    }

    const parsedParams = metricKeyParamsSchema.safeParse(req.params);
    if (!parsedParams.success) {
      res.status(400).json({ ok: false, error: { code: "INVALID_PARAMS", requestId: getRid(req) } });
      return;
    }
    const parsedQuery = historyQuerySchema.safeParse(req.query);
    if (!parsedQuery.success) {
      res.status(400).json({ ok: false, error: { code: "INVALID_QUERY", requestId: getRid(req) } });
      return;
    }

    const { metricKey } = parsedParams.data;
    const catalog = getLabMetricByKey(metricKey);
    if (!catalog) {
      res.status(404).json({ ok: false, error: { code: "NOT_FOUND", resource: "labMetric", id: metricKey } });
      return;
    }

    const snap = await userCollection(uid, "labAcceptedResults")
      .where("canonicalMetricId", "==", metricKey)
      .limit(200)
      .get();

    const accepted: AcceptedLabResult[] = [];
    for (const doc of snap.docs) {
      const validated = acceptedLabResultSchema.safeParse({ ...doc.data(), id: doc.id });
      if (validated.success) accepted.push(validated.data);
    }

    const historyEligible = accepted.filter((row) => row.collectedAt);
    const consumerRows = historyEligible.map((row) => acceptedToConsumerHistoryRow(row, metricKey));
    const eligibleIds = new Set(selectLabConsumerHistoryRows(consumerRows).map((r) => r.id));
    const ordered = sortLabHistoryByCollectionDate(
      historyEligible.filter((row) => eligibleIds.has(row.id)),
    );
    const cursor = parsedQuery.data.cursor ?? null;
    const startIdx = cursor ? ordered.findIndex((row) => row.id === cursor) + 1 : 0;
    const slice = ordered.slice(Math.max(0, startIdx), Math.max(0, startIdx) + parsedQuery.data.limit);
    const points = slice.map((row) => toHistoryPointDto(row));
    const nextCursor =
      startIdx + parsedQuery.data.limit < ordered.length ? (slice[slice.length - 1]?.id ?? null) : null;

    const payload = {
      ok: true as const,
      canonicalMetricId: metricKey,
      displayName: catalog.displayName,
      points,
      nextCursor,
    };
    const validated = labAnalyteHistoryDtoSchema.safeParse(payload);
    if (!validated.success) {
      res.status(500).json({ ok: false, error: { code: "INTERNAL_CONTRACT_MISMATCH", requestId: getRid(req) } });
      return;
    }
    res.status(200).json(validated.data);
  }),
);

export default router;
