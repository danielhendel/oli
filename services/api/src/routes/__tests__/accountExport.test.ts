/** @jest-environment node */
/**
 * Account export API routes — status, download, duplicate request semantics.
 */

import { describe, it, expect, beforeAll, jest } from "@jest/globals";
import express from "express";
import { initializeApp, getApps } from "firebase-admin/app";
import { FieldValue } from "firebase-admin/firestore";
import { requestIdMiddleware } from "../../lib/logger";

jest.mock("../../lib/pubsub", () => ({
  publishJSON: jest.fn().mockResolvedValue("mock-message-id"),
}));

jest.mock("firebase-admin/storage", () => ({
  getStorage: () => ({
    bucket: () => ({
      file: () => ({
        getSignedUrl: jest.fn().mockResolvedValue(["https://signed.example/export.zip"]),
      }),
    }),
  }),
}));

let accountRouter: express.Router;
let db: import("firebase-admin/firestore").Firestore;

const TEST_UID = "u_export_api_test";

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

describe("account export routes", () => {
  beforeAll(() => {
    requireEmulator();
    process.env.TOPIC_EXPORTS = "exports.requests.v1";
    if (getApps().length === 0) {
      initializeApp({ projectId: process.env.GCLOUD_PROJECT ?? "demo-oli" });
    }
    accountRouter = require("../account").default;
    db = require("../../db").db;
  });

  it("GET /export/latest returns null when no exports", async () => {
    const app = buildTestApp("u_export_empty");
    const server = app.listen(0);
    const address = server.address();
    if (!address || typeof address === "string") throw new Error("bind failed");
    const base = `http://127.0.0.1:${address.port}`;

    try {
      const res = await fetch(`${base}/export/latest`);
      expect(res.status).toBe(200);
      const body = (await res.json()) as { ok: boolean; export: unknown };
      expect(body.ok).toBe(true);
      expect(body.export).toBeNull();
    } finally {
      server.close();
    }
  });

  it("POST /export is idempotent for the same request id", async () => {
    const requestId = "export-dup-test-001";
    const app = buildTestApp();
    const server = app.listen(0);
    const address = server.address();
    if (!address || typeof address === "string") throw new Error("bind failed");
    const base = `http://127.0.0.1:${address.port}`;

    try {
      const first = await fetch(`${base}/export`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-request-id": requestId },
      });
      expect(first.status).toBe(202);

      const second = await fetch(`${base}/export`, {
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

  it("GET /export/:requestId/download requires completed export", async () => {
    const requestId = "export-download-not-ready";
    await db
      .collection("users")
      .doc(TEST_UID)
      .collection("accountExports")
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
      const res = await fetch(`${base}/export/${requestId}/download`);
      expect(res.status).toBe(409);
      const body = (await res.json()) as { error: { code: string } };
      expect(body.error.code).toBe("EXPORT_NOT_READY");
    } finally {
      server.close();
    }
  });

  it("GET /export/:requestId/download returns signed URL for completed export", async () => {
    const requestId = "export-download-ready";
    const completedAt = new Date().toISOString();
    await db
      .collection("users")
      .doc(TEST_UID)
      .collection("accountExports")
      .doc(requestId)
      .set({
        uid: TEST_UID,
        requestId,
        requestedAt: completedAt,
        status: "completed",
        packageAvailable: true,
        completedAt,
        updatedAt: FieldValue.serverTimestamp(),
      });

    const globalId = `${TEST_UID}_${requestId}`;
    await db.collection("accountExports").doc(globalId).set({
      uid: TEST_UID,
      requestId,
      status: "completed",
      artifact: {
        bucket: "test-bucket",
        object: `exports/${TEST_UID}/${requestId}.zip`,
        contentType: "application/zip",
      },
    });

    const app = buildTestApp();
    const server = app.listen(0);
    const address = server.address();
    if (!address || typeof address === "string") throw new Error("bind failed");
    const base = `http://127.0.0.1:${address.port}`;

    try {
      const res = await fetch(`${base}/export/${requestId}/download`);
      expect(res.status).toBe(200);
      const body = (await res.json()) as { ok: boolean; downloadUrl: string; expiresAt: string };
      expect(body.ok).toBe(true);
      expect(body.downloadUrl).toContain("https://");
      expect(body.expiresAt.length).toBeGreaterThan(0);
    } finally {
      server.close();
    }
  });

  it("denies cross-user export status access", async () => {
    const otherUid = "u_export_other";
    const requestId = "export-cross-user";
    await db
      .collection("users")
      .doc(otherUid)
      .collection("accountExports")
      .doc(requestId)
      .set({
        uid: otherUid,
        requestId,
        requestedAt: new Date().toISOString(),
        status: "completed",
        packageAvailable: true,
      });

    const app = buildTestApp(TEST_UID);
    const server = app.listen(0);
    const address = server.address();
    if (!address || typeof address === "string") throw new Error("bind failed");
    const base = `http://127.0.0.1:${address.port}`;

    try {
      const res = await fetch(`${base}/export/${requestId}`);
      expect(res.status).toBe(404);
    } finally {
      server.close();
    }
  });
});
