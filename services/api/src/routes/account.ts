// services/api/src/routes/account.ts
import { Router, type Response } from "express";

import { publishJSON } from "../lib/pubsub";
import type { AuthedRequest } from "../middleware/auth";
import { FieldValue, userCollection } from "../db";

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
    error: {
      code: "SERVER_MISCONFIG",
      message,
      requestId,
    },
  };
  return res.status(500).json(body);
};

const jsonBadRequest = (res: Response, requestId: string, message: string) => {
  const body: ApiError = {
    ok: false,
    error: {
      code: "BAD_REQUEST",
      message,
      requestId,
    },
  };
  return res.status(400).json(body);
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

/** Request a user export (publishes to Pub/Sub) */
router.post("/export", async (req: AuthedRequest, res: Response) => {
  const rid = getRequestId(req, res);
  const uid = assertAuthedUid(req, res);
  if (!uid) return;

  // We require a stable request id for idempotency.
  if (!rid || rid === "missing") {
    return jsonBadRequest(res, rid, "Missing x-request-id");
  }

  const topic = requireEnv("TOPIC_EXPORTS");
  if (!topic) return jsonServerMisconfig(res, rid, "Missing TOPIC_EXPORTS env var");

  const requestId = rid; // stable correlation id across gateway -> api -> pubsub -> worker
  const statusRef = userCollection(uid, "accountExports").doc(requestId);

  // ✅ Idempotency: if status doc already exists, return it and DO NOT republish
  const existing = await statusRef.get();
  if (existing.exists) {
    const data = existing.data() as Record<string, unknown> | undefined;
    const status = typeof data?.["status"] === "string" ? (data?.["status"] as string) : "unknown";

    // Keep semantics simple: retry returns current state.
    return res.status(200).json({ ok: true as const, status, requestId });
  }

  const requestedAt = new Date().toISOString();

  // ✅ Create queued status doc immediately (observable from the moment API returns 202)
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
