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
        exists: jest.fn().mockResolvedValue([true]),
        getMetadata: jest.fn().mockResolvedValue([{ size: "1024", contentType: "application/zip" }]),
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

  it("GET /export/:requestId/download returns 503 when signing fails", async () => {
    const requestId = "export-download-sign-fail";
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
    await db.collection("accountExports").doc(`${TEST_UID}_${requestId}`).set({
      uid: TEST_UID,
      requestId,
      status: "completed",
      artifact: {
        bucket: "test-bucket",
        object: `exports/${TEST_UID}/${requestId}.zip`,
        contentType: "application/zip",
        size: 2048,
      },
    });

    const fileMock = {
      exists: jest.fn().mockResolvedValue([true]),
      getMetadata: jest.fn().mockResolvedValue([{ size: "2048", contentType: "application/zip" }]),
      getSignedUrl: jest.fn().mockRejectedValue(new Error("Permission signBlob denied")),
    };
    const storageMod = jest.requireMock("firebase-admin/storage") as {
      getStorage: () => { bucket: () => { file: () => typeof fileMock } };
    };
    storageMod.getStorage = () => ({
      bucket: () => ({
        file: () => fileMock,
      }),
    });

    const app = buildTestApp();
    const server = app.listen(0);
    const address = server.address();
    if (!address || typeof address === "string") throw new Error("bind failed");
    const base = `http://127.0.0.1:${address.port}`;

    try {
      const res = await fetch(`${base}/export/${requestId}/download`);
      expect(res.status).toBe(503);
      const body = (await res.json()) as { error: { code: string; message: string } };
      expect(body.error.code).toBe("SIGNED_URL_UNAVAILABLE");
      expect(body.error.message).not.toMatch(/signBlob|Permission/i);
    } finally {
      storageMod.getStorage = () => ({
        bucket: () => ({
          file: () => ({
            exists: jest.fn().mockResolvedValue([true]),
            getMetadata: jest.fn().mockResolvedValue([{ size: "1024", contentType: "application/zip" }]),
            getSignedUrl: jest.fn().mockResolvedValue(["https://signed.example/export.zip"]),
          }),
        }),
      });
      server.close();
    }
  });

  it("GET /export/:requestId/download returns 404 when object is missing", async () => {
    const requestId = "export-download-missing-object";
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
    await db.collection("accountExports").doc(`${TEST_UID}_${requestId}`).set({
      uid: TEST_UID,
      requestId,
      status: "completed",
      artifact: {
        bucket: "test-bucket",
        object: `exports/${TEST_UID}/${requestId}.zip`,
        contentType: "application/zip",
      },
    });

    const storageMod = jest.requireMock("firebase-admin/storage") as {
      getStorage: () => { bucket: () => { file: () => unknown } };
    };
    storageMod.getStorage = () => ({
      bucket: () => ({
        file: () => ({
          exists: jest.fn().mockResolvedValue([false]),
          getMetadata: jest.fn(),
          getSignedUrl: jest.fn(),
        }),
      }),
    });

    const app = buildTestApp();
    const server = app.listen(0);
    const address = server.address();
    if (!address || typeof address === "string") throw new Error("bind failed");
    const base = `http://127.0.0.1:${address.port}`;

    try {
      const res = await fetch(`${base}/export/${requestId}/download`);
      expect(res.status).toBe(404);
      const body = (await res.json()) as { error: { code: string } };
      expect(body.error.code).toBe("ARTIFACT_UNAVAILABLE");
    } finally {
      storageMod.getStorage = () => ({
        bucket: () => ({
          file: () => ({
            exists: jest.fn().mockResolvedValue([true]),
            getMetadata: jest.fn().mockResolvedValue([{ size: "1024", contentType: "application/zip" }]),
            getSignedUrl: jest.fn().mockResolvedValue(["https://signed.example/export.zip"]),
          }),
        }),
      });
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

  it("GET /export/latest maps ancient queued to failed stale_pending", async () => {
    const uid = "u_export_stale_latest";
    const requestId = "export-stale-jan";
    await db
      .collection("users")
      .doc(uid)
      .collection("accountExports")
      .doc(requestId)
      .set({
        uid,
        requestId,
        requestedAt: "2026-01-25T16:47:47.201Z",
        status: "queued",
        updatedAt: FieldValue.serverTimestamp(),
      });

    const app = buildTestApp(uid);
    const server = app.listen(0);
    const address = server.address();
    if (!address || typeof address === "string") throw new Error("bind failed");
    const base = `http://127.0.0.1:${address.port}`;

    try {
      const res = await fetch(`${base}/export/latest`);
      expect(res.status).toBe(200);
      const body = (await res.json()) as {
        ok: boolean;
        export: { status: string; failureCategory?: string; retryable: boolean };
      };
      expect(body.export.status).toBe("failed");
      expect(body.export.failureCategory).toBe("stale_pending");
      expect(body.export.retryable).toBe(true);
    } finally {
      server.close();
    }
  });

  it("GET /export/latest prefers newest requestedAt", async () => {
    const uid = "u_export_order";
    await db
      .collection("users")
      .doc(uid)
      .collection("accountExports")
      .doc("old-queued")
      .set({
        uid,
        requestId: "old-queued",
        requestedAt: "2026-01-25T16:47:47.201Z",
        status: "queued",
      });
    await db
      .collection("users")
      .doc(uid)
      .collection("accountExports")
      .doc("newer-failed")
      .set({
        uid,
        requestId: "newer-failed",
        requestedAt: "2026-08-20T12:00:00.000Z",
        status: "failed",
        error: "document_export_incomplete",
      });

    const app = buildTestApp(uid);
    const server = app.listen(0);
    const address = server.address();
    if (!address || typeof address === "string") throw new Error("bind failed");
    const base = `http://127.0.0.1:${address.port}`;

    try {
      const res = await fetch(`${base}/export/latest`);
      expect(res.status).toBe(200);
      const body = (await res.json()) as {
        export: { requestId: string; status: string };
      };
      expect(body.export.requestId).toBe("newer-failed");
      expect(body.export.status).toBe("failed");
    } finally {
      server.close();
    }
  });

  it("POST /export reuses active pending and allows new after stale", async () => {
    const uid = "u_export_reuse";
    const pendingId = "export-active-pending";
    await db
      .collection("users")
      .doc(uid)
      .collection("accountExports")
      .doc(pendingId)
      .set({
        uid,
        requestId: pendingId,
        requestedAt: new Date().toISOString(),
        status: "queued",
      });

    const app = buildTestApp(uid);
    const server = app.listen(0);
    const address = server.address();
    if (!address || typeof address === "string") throw new Error("bind failed");
    const base = `http://127.0.0.1:${address.port}`;

    try {
      const reuse = await fetch(`${base}/export`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-request-id": "brand-new-id-should-reuse",
        },
      });
      expect(reuse.status).toBe(200);
      const reuseBody = (await reuse.json()) as { requestId: string };
      expect(reuseBody.requestId).toBe(pendingId);

      // Stale prior request should not block a new request id.
      const staleUid = "u_export_after_stale";
      await db
        .collection("users")
        .doc(staleUid)
        .collection("accountExports")
        .doc("ancient")
        .set({
          uid: staleUid,
          requestId: "ancient",
          requestedAt: "2026-01-25T16:47:47.201Z",
          status: "queued",
        });

      const app2 = buildTestApp(staleUid);
      const server2 = app2.listen(0);
      const address2 = server2.address();
      if (!address2 || typeof address2 === "string") throw new Error("bind failed");
      const base2 = `http://127.0.0.1:${address2.port}`;
      try {
        const fresh = await fetch(`${base2}/export`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-request-id": "fresh-after-stale",
          },
        });
        expect(fresh.status).toBe(202);
        const freshBody = (await fresh.json()) as { requestId: string; status: string };
        expect(freshBody.requestId).toBe("fresh-after-stale");
        expect(freshBody.status).toBe("queued");
      } finally {
        server2.close();
      }
    } finally {
      server.close();
    }
  });

  it("POST /export marks failed when Pub/Sub publish throws", async () => {
    const { publishJSON } = require("../../lib/pubsub") as {
      publishJSON: jest.Mock;
    };
    publishJSON.mockRejectedValueOnce(new Error("pubsub_down"));

    const uid = "u_export_publish_fail";
    const requestId = "export-publish-fail";
    const app = buildTestApp(uid);
    const server = app.listen(0);
    const address = server.address();
    if (!address || typeof address === "string") throw new Error("bind failed");
    const base = `http://127.0.0.1:${address.port}`;

    try {
      const res = await fetch(`${base}/export`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-request-id": requestId },
      });
      expect(res.status).toBe(503);
      const snap = await db
        .collection("users")
        .doc(uid)
        .collection("accountExports")
        .doc(requestId)
        .get();
      expect(snap.exists).toBe(true);
      expect(snap.data()?.status).toBe("failed");
      expect(snap.data()?.error).toBe("publish_failed");
    } finally {
      server.close();
      publishJSON.mockResolvedValue("mock-message-id");
    }
  });
});
