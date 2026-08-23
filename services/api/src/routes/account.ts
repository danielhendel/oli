// services/api/src/routes/account.ts
import { Router, type Response } from "express";

import { publishJSON } from "../lib/pubsub";
import type { AuthedRequest } from "../middleware/auth";
import { FieldValue, userCollection } from "../db";
import {
  buildExportStatusDto,
  createExportDownloadResponse,
  loadLatestUserExportDoc,
  loadUserExportDoc,
} from "../lib/account/exportStatus";

const router = Router();

type ApiError = {
  ok: false;
  error: {
    code: string;
    message: string;
    requestId: string;
  };
};

const jsonServerMisconfig = (res: Response, requestId: string, message: string) => {
  const body: ApiError = {
    ok: false,
    error: { code: "SERVER_MISCONFIG", message, requestId },
  };
  return res.status(500).json(body);
};

const jsonBadRequest = (res: Response, requestId: string, message: string) => {
  const body: ApiError = {
    ok: false,
    error: { code: "BAD_REQUEST", message, requestId },
  };
  return res.status(400).json(body);
};

const jsonNotFound = (res: Response, requestId: string, message: string) => {
  const body: ApiError = {
    ok: false,
    error: { code: "NOT_FOUND", message, requestId },
  };
  return res.status(404).json(body);
};

const getRequestId = (req: AuthedRequest, res: Response): string => {
  return req.rid ?? res.getHeader("x-request-id")?.toString() ?? "missing";
};

const assertAuthedUid = (req: AuthedRequest, res: Response): string | null => {
  const uid = req.uid;
  if (!uid) {
    res.status(401).json({
      ok: false,
      error: {
        code: "UNAUTHORIZED",
        message: "Unauthorized",
        requestId: getRequestId(req, res),
      },
    });
    return null;
  }
  return uid;
};

const requireEnv = (key: "TOPIC_EXPORTS" | "TOPIC_DELETE"): string | null => {
  const v = process.env[key];
  if (typeof v !== "string") return null;
  const trimmed = v.trim();
  return trimmed.length > 0 ? trimmed : null;
};

/** Latest export status for the authenticated user. */
/** Route: GET /export/latest */
router.get("/export/latest", async (req: AuthedRequest, res: Response) => {
  const uid = assertAuthedUid(req, res);
  if (!uid) return;

  const latest = await loadLatestUserExportDoc(uid);
  if (!latest) {
    return res.status(200).json({ ok: true as const, export: null });
  }

  const exportStatus = buildExportStatusDto(latest.requestId, latest.data);
  return res.status(200).json({ ok: true as const, export: exportStatus });
});

/** Export status for a specific request. */
/** Route: GET /export/:requestId */
router.get("/export/:requestId", async (req: AuthedRequest, res: Response) => {
  const rid = getRequestId(req, res);
  const uid = assertAuthedUid(req, res);
  if (!uid) return;

  const requestId = typeof req.params.requestId === "string" ? req.params.requestId.trim() : "";
  if (!requestId) {
    return jsonBadRequest(res, rid, "Missing request id");
  }

  const data = await loadUserExportDoc(uid, requestId);
  if (!data) {
    return jsonNotFound(res, rid, "Export request not found");
  }

  const exportStatus = buildExportStatusDto(requestId, data);
  return res.status(200).json({ ok: true as const, ...exportStatus });
});

/** Short-lived signed download URL for a completed export. */
/** Route: GET /export/:requestId/download */
router.get("/export/:requestId/download", async (req: AuthedRequest, res: Response) => {
  const rid = getRequestId(req, res);
  const uid = assertAuthedUid(req, res);
  if (!uid) return;

  const requestId = typeof req.params.requestId === "string" ? req.params.requestId.trim() : "";
  if (!requestId) {
    return jsonBadRequest(res, rid, "Missing request id");
  }

  const data = await loadUserExportDoc(uid, requestId);
  if (!data) {
    return jsonNotFound(res, rid, "Export request not found");
  }

  const download = await createExportDownloadResponse(uid, requestId, data);
  if ("code" in download) {
    const status =
      download.code === "EXPORT_EXPIRED"
        ? 410
        : download.code === "EXPORT_NOT_READY"
          ? 409
          : 404;
    return res.status(status).json({
      ok: false as const,
      error: { code: download.code, message: download.message, requestId: rid },
    });
  }

  return res.status(200).json(download);
});

/** Request a user export (publishes to Pub/Sub) */
/** Route: POST /export */
router.post("/export", async (req: AuthedRequest, res: Response) => {
  const rid = getRequestId(req, res);
  const uid = assertAuthedUid(req, res);
  if (!uid) return;

  if (!rid || rid === "missing") {
    return jsonBadRequest(res, rid, "Missing x-request-id");
  }

  const topic = requireEnv("TOPIC_EXPORTS");
  if (!topic) return jsonServerMisconfig(res, rid, "Missing TOPIC_EXPORTS env var");

  const requestId = rid;
  const statusRef = userCollection(uid, "accountExports").doc(requestId);

  const existing = await statusRef.get();
  if (existing.exists) {
    const data = existing.data() as Record<string, unknown> | undefined;
    const statusDto = buildExportStatusDto(requestId, data ?? {});
    return res.status(200).json({
      ok: true as const,
      status: statusDto.backendStatus,
      requestId,
    });
  }

  const requestedAt = new Date().toISOString();

  await statusRef.set(
    {
      uid,
      requestId,
      requestedAt,
      status: "queued",
      updatedAt: FieldValue.serverTimestamp(),
    },
    { merge: false },
  );

  await publishJSON(
    topic,
    { uid, requestId, requestedAt },
    { requestId, uid, kind: "export.requested.v1" },
  );

  return res.status(202).json({ ok: true as const, status: "queued" as const, requestId });
});

/** Request account deletion (publishes to Pub/Sub) */
/** Route: POST /account/delete */
router.post("/account/delete", async (req: AuthedRequest, res: Response) => {
  const rid = getRequestId(req, res);
  const uid = assertAuthedUid(req, res);
  if (!uid) return;

  if (!rid || rid === "missing") {
    return jsonBadRequest(res, rid, "Missing x-request-id");
  }

  const topic = requireEnv("TOPIC_DELETE");
  if (!topic) return jsonServerMisconfig(res, rid, "Missing TOPIC_DELETE env var");

  const requestedAt = new Date().toISOString();
  const requestId = rid;

  await publishJSON(
    topic,
    { uid, requestId, requestedAt },
    { requestId, uid, kind: "account.delete.requested.v1" },
  );

  return res.status(202).json({ ok: true as const, status: "queued" as const, requestId });
});

export default router;
