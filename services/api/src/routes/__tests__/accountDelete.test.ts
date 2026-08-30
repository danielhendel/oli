/** @jest-environment node */
/**
 * Account deletion API routes — idempotency and status recovery.
 */

import { describe, it, expect, beforeAll, jest } from "@jest/globals";
import express from "express";
import { initializeApp, getApps } from "firebase-admin/app";
import { FieldValue } from "firebase-admin/firestore";
import { requestIdMiddleware } from "../../lib/logger";

jest.mock("../../lib/pubsub", () => ({
  publishJSON: jest.fn().mockResolvedValue("mock-message-id"),
}));

let accountRouter: express.Router;
let db: import("firebase-admin/firestore").Firestore;

const TEST_UID = "u_delete_api_test";

function requireEmulator() {
  const host = process.env.FIRESTORE_EMULATOR_HOST;
  if (!host?.trim()) {
    throw new Error("FIRESTORE_EMULATOR_HOST must be set");
  }
}

function buildTestApp(uid: string = TEST_UID) {
  const app = express();
  app.use(express.json({ limit: "1mb" }));
  app.use(requestIdMiddleware);
  app.use((req, _res, next) => {
    (req as unknown as { uid?: string }).uid = uid;
    next();
  });
  app.use("/", accountRouter);
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
    db = require("../../db").db;
  });

  it("GET /delete/latest returns null when no deletions", async () => {
    const app = buildTestApp("u_delete_empty");
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

  it("POST /account/delete is idempotent for the same request id", async () => {
    const requestId = "delete-dup-test-001";
    const app = buildTestApp();
    const server = app.listen(0);
    const address = server.address();
    if (!address || typeof address === "string") throw new Error("bind failed");
    const base = `http://127.0.0.1:${address.port}`;

    try {
      const first = await fetch(`${base}/account/delete`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-request-id": requestId },
      });
      expect(first.status).toBe(202);

      const second = await fetch(`${base}/account/delete`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-request-id": requestId },
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
});
