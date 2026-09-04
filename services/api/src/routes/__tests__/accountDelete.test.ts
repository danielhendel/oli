/** @jest-environment node */
/**
 * Account deletion API routes — recent auth, idempotency, ledger, status recovery.
 */

import { describe, it, expect, beforeAll, jest } from "@jest/globals";
import express from "express";
import { initializeApp, getApps } from "firebase-admin/app";
import { FieldValue } from "firebase-admin/firestore";
import { requestIdMiddleware } from "../../lib/logger";
import { globalAccountDeletionDocId } from "../../../../../lib/data/user-data/accountDeletionFirestoreCollections";
import type { AuthedRequest } from "../../middleware/auth";

jest.mock("../../lib/pubsub", () => ({
  publishJSON: jest.fn().mockResolvedValue("mock-message-id"),
}));

let accountRouter: express.Router;
let db: import("firebase-admin/firestore").Firestore;
let deletionPendingGate: typeof import("../../middleware/deletionPendingGate").deletionPendingGate;

const TEST_UID = "u_delete_api_test";

function requireEmulator() {
  const host = process.env.FIRESTORE_EMULATOR_HOST;
  if (!host?.trim()) {
    throw new Error("FIRESTORE_EMULATOR_HOST must be set");
  }
}

function buildTestApp(args?: { uid?: string; authTime?: number | undefined }) {
  const uid = args?.uid ?? TEST_UID;
  const authTime =
    args && "authTime" in args
      ? args.authTime
      : Math.floor(Date.now() / 1000);

  const app = express();
  app.use(express.json({ limit: "1mb" }));
  app.use(requestIdMiddleware);
  app.use((req, _res, next) => {
    const r = req as AuthedRequest;
    r.uid = uid;
    if (typeof authTime === "number") {
      r.authTime = authTime;
    } else {
      delete r.authTime;
    }
    next();
  });
  app.use("/", deletionPendingGate, accountRouter);
  return app;
}

describe("account deletion routes", () => {
  beforeAll(() => {
    requireEmulator();
    process.env.TOPIC_DELETE = "account.delete.v1";
    if (getApps().length === 0) {
      initializeApp({ projectId: process.env.GCLOUD_PROJECT ?? "demo-oli" });
    }
    accountRouter = require("../account").default;
    deletionPendingGate = require("../../middleware/deletionPendingGate").deletionPendingGate;
    db = require("../../db").db;
  });

  it("GET /delete/latest returns null when no deletions", async () => {
    const app = buildTestApp({ uid: "u_delete_empty" });
    const server = app.listen(0);
    const address = server.address();
    if (!address || typeof address === "string") throw new Error("bind failed");
    const base = `http://127.0.0.1:${address.port}`;

    try {
      const res = await fetch(`${base}/delete/latest`);
      expect(res.status).toBe(200);
      const body = (await res.json()) as { ok: boolean; deletion: unknown };
      expect(body.ok).toBe(true);
      expect(body.deletion).toBeNull();
    } finally {
      server.close();
    }
  });

  it("POST /account/delete rejects missing auth_time", async () => {
    const app = buildTestApp({ uid: "u_delete_no_auth_time", authTime: undefined });
    const server = app.listen(0);
    const address = server.address();
    if (!address || typeof address === "string") throw new Error("bind failed");
    const base = `http://127.0.0.1:${address.port}`;

    try {
      const res = await fetch(`${base}/account/delete`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-request-id": "delete-no-auth-time" },
        body: JSON.stringify({ reauthenticated: true, auth_time: Math.floor(Date.now() / 1000) }),
      });
      expect(res.status).toBe(401);
      const body = (await res.json()) as { error: { code: string } };
      expect(body.error.code).toBe("REAUTH_REQUIRED");
    } finally {
      server.close();
    }
  });

  it("POST /account/delete rejects stale auth_time even with client freshness claims", async () => {
    const stale = Math.floor(Date.now() / 1000) - 10 * 60;
    const app = buildTestApp({ uid: "u_delete_stale", authTime: stale });
    const server = app.listen(0);
    const address = server.address();
    if (!address || typeof address === "string") throw new Error("bind failed");
    const base = `http://127.0.0.1:${address.port}`;

    try {
      const res = await fetch(`${base}/account/delete`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-request-id": "delete-stale-auth" },
        body: JSON.stringify({ reauthenticated: true, password: "should-never-be-read" }),
      });
      expect(res.status).toBe(401);
      const body = (await res.json()) as { error: { code: string; message: string } };
      expect(body.error.code).toBe("REAUTH_REQUIRED");
      expect(body.error.message.toLowerCase()).not.toContain("password");
    } finally {
      server.close();
    }
  });

  it("POST /account/delete is idempotent and creates durable ledger at accept", async () => {
    const requestId = "delete-dup-test-001";
    const uid = "u_delete_ledger_accept";
    const app = buildTestApp({ uid });
    const server = app.listen(0);
    const address = server.address();
    if (!address || typeof address === "string") throw new Error("bind failed");
    const base = `http://127.0.0.1:${address.port}`;

    try {
      const first = await fetch(`${base}/account/delete`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-request-id": requestId },
        body: JSON.stringify({}),
      });
      expect(first.status).toBe(202);

      const mirror = await db
        .collection("users")
        .doc(uid)
        .collection("accountDeletion")
        .doc(requestId)
        .get();
      expect(mirror.exists).toBe(true);
      expect(mirror.data()?.status).toBe("queued");

      const globalId = globalAccountDeletionDocId(uid, requestId);
      const ledger = await db.collection("accountDeletions").doc(globalId).get();
      expect(ledger.exists).toBe(true);
      expect(ledger.data()?.status).toBe("queued");
      expect(ledger.data()?.uid).toBe(uid);
      expect(ledger.data()?.storageDelete).toBeUndefined();
      expect(ledger.data()?.expireAt).toBeTruthy();
      expect(ledger.data()?.retentionDays).toBe(90);

      const second = await fetch(`${base}/account/delete`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-request-id": requestId },
        body: JSON.stringify({}),
      });
      expect(second.status).toBe(200);
      const body = (await second.json()) as { requestId: string; status: string };
      expect(body.requestId).toBe(requestId);
      expect(body.status).toBe("queued");
    } finally {
      server.close();
    }
  });

  it("GET /delete/:requestId returns status for existing request", async () => {
    const requestId = "delete-status-test";
    await db
      .collection("users")
      .doc(TEST_UID)
      .collection("accountDeletion")
      .doc(requestId)
      .set({
        uid: TEST_UID,
        requestId,
        requestedAt: new Date().toISOString(),
        status: "queued",
        updatedAt: FieldValue.serverTimestamp(),
      });

    const app = buildTestApp();
    const server = app.listen(0);
    const address = server.address();
    if (!address || typeof address === "string") throw new Error("bind failed");
    const base = `http://127.0.0.1:${address.port}`;

    try {
      const res = await fetch(`${base}/delete/${requestId}`);
      expect(res.status).toBe(200);
      const body = (await res.json()) as { status: string; requestId: string };
      expect(body.requestId).toBe(requestId);
      expect(body.status).toBe("queued");
    } finally {
      server.close();
    }
  });

  it("blocks export while deletion is pending but allows delete status", async () => {
    const uid = "u_delete_pending_gate";
    const requestId = "delete-pending-gate-1";
    await db
      .collection("users")
      .doc(uid)
      .collection("accountDeletion")
      .doc(requestId)
      .set({
        uid,
        requestId,
        requestedAt: new Date().toISOString(),
        status: "queued",
        updatedAt: FieldValue.serverTimestamp(),
      });
    await db
      .collection("accountDeletions")
      .doc(globalAccountDeletionDocId(uid, requestId))
      .set({
        uid,
        requestId,
        requestedAt: new Date().toISOString(),
        status: "queued",
        updatedAt: FieldValue.serverTimestamp(),
      });

    process.env.TOPIC_EXPORTS = "account.export.v1";
    const app = buildTestApp({ uid });
    const server = app.listen(0);
    const address = server.address();
    if (!address || typeof address === "string") throw new Error("bind failed");
    const base = `http://127.0.0.1:${address.port}`;

    try {
      const blocked = await fetch(`${base}/export`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-request-id": "export-while-deleting" },
        body: JSON.stringify({}),
      });
      expect(blocked.status).toBe(403);
      const blockedBody = (await blocked.json()) as { error: { code: string } };
      expect(blockedBody.error.code).toBe("ACCOUNT_DELETION_PENDING");

      const allowed = await fetch(`${base}/delete/latest`);
      expect(allowed.status).toBe(200);
    } finally {
      server.close();
    }
  });
});
