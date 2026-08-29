/**
 * Account export API helpers (Cloud Run).
 */

import { getStorage } from "firebase-admin/storage";
import {
  EXPORT_DOWNLOAD_URL_TTL_SECONDS,
  type ExportDownloadResponseDto,
  type ExportStatusResponseDto,
} from "@oli/contracts";
import {
  coerceBackendStatus,
  firestoreTimestampToIso,
  globalExportDocId,
  normalizeExportStatus,
} from "../../../../../lib/data/user-data/export/normalizeExportStatus";
import { db, FieldValue } from "../../db";

const ACCOUNT_EXPORTS_GLOBAL = "accountExports";

export type UserExportDoc = Record<string, unknown>;

export async function loadLatestUserExportDoc(uid: string): Promise<{
  requestId: string;
  data: UserExportDoc;
} | null> {
  // Prefer server-authored requestedAt; fall back to document id order only if query fails.
  try {
    const snap = await db
      .collection("users")
      .doc(uid)
      .collection("accountExports")
      .orderBy("requestedAt", "desc")
      .limit(1)
      .get();

    if (!snap.empty) {
      const doc = snap.docs[0]!;
      return { requestId: doc.id, data: doc.data() as UserExportDoc };
    }
  } catch {
    // Missing index or malformed timestamps — fall through to scan.
  }

  const all = await db.collection("users").doc(uid).collection("accountExports").get();
  if (all.empty) return null;

  let best: { requestId: string; data: UserExportDoc; score: number } | null = null;
  for (const doc of all.docs) {
    const data = doc.data() as UserExportDoc;
    const requestedAt = typeof data.requestedAt === "string" ? data.requestedAt : null;
    const updatedAt = firestoreTimestampToIso(data.updatedAt);
    const t = Date.parse(requestedAt ?? updatedAt ?? "") || 0;
    if (!best || t > best.score) {
      best = { requestId: doc.id, data, score: t };
    }
  }
  return best ? { requestId: best.requestId, data: best.data } : null;
}

export async function loadUserExportDoc(
  uid: string,
  requestId: string,
): Promise<UserExportDoc | null> {
  const snap = await db
    .collection("users")
    .doc(uid)
    .collection("accountExports")
    .doc(requestId)
    .get();
  if (!snap.exists) return null;
  return snap.data() as UserExportDoc;
}

export function buildExportStatusDto(
  requestId: string,
  data: UserExportDoc,
): Omit<ExportStatusResponseDto, "ok"> {
  const backendStatus = coerceBackendStatus(data.status);
  const packageAvailable = data.packageAvailable === true || backendStatus === "succeeded";
  const requestedAt = typeof data.requestedAt === "string" ? data.requestedAt : null;
  const completedAt = firestoreTimestampToIso(data.completedAt);
  const updatedAt = firestoreTimestampToIso(data.updatedAt);
  const startedAt = firestoreTimestampToIso(data.startedAt);

  const normalized = normalizeExportStatus({
    backendStatus,
    packageAvailable,
    requestedAt,
    completedAt,
    updatedAt,
    startedAt,
  });

  return {
    requestId,
    status: normalized.status,
    backendStatus,
    requestedAt,
    updatedAt,
    completedAt,
    expiresAt: normalized.expiresAt,
    packageAvailable,
    retryable: normalized.retryable,
    failureCategory: normalized.failureCategory,
  };
}

/** True when the latest request is still actively pending (not stale). */
export function isActivePendingExport(data: UserExportDoc): boolean {
  const dto = buildExportStatusDto("probe", data);
  return dto.status === "pending";
}

export async function markUserExportFailed(
  uid: string,
  requestId: string,
  errorCode: string,
): Promise<void> {
  await db
    .collection("users")
    .doc(uid)
    .collection("accountExports")
    .doc(requestId)
    .set(
      {
        status: "failed",
        error: errorCode,
        updatedAt: FieldValue.serverTimestamp(),
      },
      { merge: true },
    );
}

export async function createExportDownloadResponse(
  uid: string,
  requestId: string,
  data: UserExportDoc,
): Promise<ExportDownloadResponseDto | { code: string; message: string }> {
  const statusDto = buildExportStatusDto(requestId, data);

  if (statusDto.status === "expired") {
    return { code: "EXPORT_EXPIRED", message: "This export has expired. Request a new export." };
  }

  if (statusDto.status !== "ready") {
    return { code: "EXPORT_NOT_READY", message: "Export is not ready for download yet." };
  }

  const globalId = globalExportDocId(uid, requestId);
  const globalSnap = await db.collection(ACCOUNT_EXPORTS_GLOBAL).doc(globalId).get();
  if (!globalSnap.exists) {
    return { code: "ARTIFACT_UNAVAILABLE", message: "Export file is not available." };
  }

  const artifact = globalSnap.data()?.artifact as
    | { bucket?: string; object?: string; contentType?: string; size?: number }
    | undefined;

  const bucketName = typeof artifact?.bucket === "string" ? artifact.bucket : "";
  const objectName = typeof artifact?.object === "string" ? artifact.object : "";
  if (!bucketName || !objectName) {
    return { code: "ARTIFACT_UNAVAILABLE", message: "Export file is not available." };
  }

  const file = getStorage().bucket(bucketName).file(objectName);
  try {
    const [exists] = await file.exists();
    if (!exists) {
      return { code: "ARTIFACT_UNAVAILABLE", message: "Export file is not available." };
    }
    const [meta] = await file.getMetadata();
    const size = meta.size != null ? Number(meta.size) : Number(artifact?.size ?? 0);
    if (!Number.isFinite(size) || size <= 0) {
      return { code: "ARTIFACT_UNAVAILABLE", message: "Export file is not available." };
    }
  } catch {
    return { code: "ARTIFACT_UNAVAILABLE", message: "Export file is not available." };
  }

  const expiresAt = new Date(Date.now() + EXPORT_DOWNLOAD_URL_TTL_SECONDS * 1000);
  try {
    const [signedUrl] = await file.getSignedUrl({
      action: "read",
      expires: expiresAt,
    });

    return {
      ok: true,
      contentType: artifact?.contentType ?? "application/zip",
      expiresAt: expiresAt.toISOString(),
      downloadUrl: signedUrl,
    };
  } catch {
    // Never log the URL or object path. IAM/signBlob failures are retryable.
    return {
      code: "SIGNED_URL_UNAVAILABLE",
      message: "Export download is temporarily unavailable. Try again.",
    };
  }
}
