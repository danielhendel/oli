// services/api/src/routes/__tests__/uploads.source-gating.test.ts
import { describe, it, expect, jest, beforeEach, afterEach } from "@jest/globals";
import express from "express";

const mockUserCollection = jest.fn();
const mockGetSource = jest.fn();

// Mock Firebase Storage save (prove not called when gating fails)
const mockSave = jest.fn();
const mockFile = jest.fn(() => ({ save: mockSave }));
const mockBucket = jest.fn(() => ({ file: mockFile }));

type JsonObject = Record<string, unknown>;
const isJsonObject = (v: unknown): v is JsonObject => typeof v === "object" && v !== null;

jest.mock("../../db", () => {
  return {
    userCollection: (...args: unknown[]) => mockUserCollection(...args),
  };
});

jest.mock("../../db/sources", () => {
  return {
    getSource: (...args: unknown[]) => mockGetSource(...args),
  };
});

jest.mock("../../firebaseAdmin", () => {
  return {
    admin: {
      storage: () => ({ bucket: (...args: unknown[]) => mockBucket(...args) }),
    },
  };
});

describe("POST /uploads - Step 4 source gating (fail-closed)", () => {
  beforeEach(() => {
    mockUserCollection.mockReset();
    mockGetSource.mockReset();
    mockSave.mockReset();
    mockFile.mockClear();
    mockBucket.mockClear();

    process.env.FIREBASE_STORAGE_BUCKET = "test-bucket";
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  const makeApp = async (): Promise<{ server: ReturnType<express.Express["listen"]>; url: string }> => {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const router = require("../uploads").default as express.Router;

    const app = express();
    app.use(express.json());

    app.use((req, _res, next) => {
      (req as unknown as { uid?: string }).uid = "user_test_123";
      next();
    });

    app.use("/uploads", router);

    const server = app.listen(0);
    const address = server.address();
    if (!address || typeof address === "string") {
      server.close();
      throw new Error("Failed to bind test server");
    }

    const url = `http://127.0.0.1:${address.port}/uploads`;
    return { server, url };
  };

  const baseBody = {
    fileBase64: Buffer.from("hello").toString("base64"),
    filename: "test.pdf",
    mimeType: "application/pdf",
  } as const;

  it("fails closed (400) when sourceId is missing and does not attempt storage or Firestore writes", async () => {
    const { server, url } = await makeApp();

    try {
      const res = await fetch(url, {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "Idempotency-Key": "idem_upload_missing_source",
        },
        body: JSON.stringify({ ...baseBody }),
      });

      expect(res.status).toBe(400);

      const body: unknown = await res.json();
      expect(isJsonObject(body)).toBe(true);
      if (!isJsonObject(body)) throw new Error("Expected JSON object");

      expect(body["ok"]).toBe(false);

      expect(mockGetSource).not.toHaveBeenCalled();
      expect(mockUserCollection).not.toHaveBeenCalled();
      expect(mockSave).not.toHaveBeenCalled();
    } finally {
      server.close();
    }
  });

  it("fails closed (404) when sourceId is invalid (unregistered) and does not attempt storage or Firestore writes", async () => {
    mockGetSource.mockResolvedValue({ ok: false, status: 404, code: "NOT_FOUND", message: "Source not found" });

    const { server, url } = await makeApp();

    try {
      const res = await fetch(url, {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "Idempotency-Key": "idem_upload_invalid_source",
        },
        body: JSON.stringify({
          ...baseBody,
          sourceId: "does_not_exist",
        }),
      });

      expect(res.status).toBe(404);

      const body: unknown = await res.json();
      expect(isJsonObject(body)).toBe(true);
      if (!isJsonObject(body)) throw new Error("Expected JSON object");

      const error = body["error"];
      expect(isJsonObject(error)).toBe(true);
      if (!isJsonObject(error)) throw new Error("Expected error object");

      expect(error["code"]).toBe("SOURCE_NOT_FOUND");

      expect(mockUserCollection).not.toHaveBeenCalled();
      expect(mockSave).not.toHaveBeenCalled();
    } finally {
      server.close();
    }
  });

  it("fails closed (400) when source is disabled and does not attempt storage or Firestore writes", async () => {
    mockGetSource.mockResolvedValue({
      ok: true,
      source: {
        id: "src_upload",
        userId: "user_test_123",
        provider: "manual",
        sourceType: "upload",
        isActive: false,
        allowedKinds: ["file"],
        supportedSchemaVersions: [1],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      ref: {},
    });

    const { server, url } = await makeApp();

    try {
      const res = await fetch(url, {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "Idempotency-Key": "idem_upload_disabled_source",
        },
        body: JSON.stringify({
          ...baseBody,
          sourceId: "src_upload",
        }),
      });

      expect(res.status).toBe(400);

      const body: unknown = await res.json();
      expect(isJsonObject(body)).toBe(true);
      if (!isJsonObject(body)) throw new Error("Expected JSON object");

      const error = body["error"];
      expect(isJsonObject(error)).toBe(true);
      if (!isJsonObject(error)) throw new Error("Expected error object");

      expect(error["code"]).toBe("SOURCE_INACTIVE");

      expect(mockUserCollection).not.toHaveBeenCalled();
      expect(mockSave).not.toHaveBeenCalled();
    } finally {
      server.close();
    }
  });

  it("fails closed (400) when kind=file is not allowed by the source and does not attempt storage or Firestore writes", async () => {
    mockGetSource.mockResolvedValue({
      ok: true,
      source: {
        id: "src_upload",
        userId: "user_test_123",
        provider: "manual",
        sourceType: "upload",
        isActive: true,
        allowedKinds: ["sleep"], // does not include "file"
        supportedSchemaVersions: [1],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      ref: {},
    });

    const { server, url } = await makeApp();

    try {
      const res = await fetch(url, {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "Idempotency-Key": "idem_upload_kind_mismatch",
        },
        body: JSON.stringify({
          ...baseBody,
          sourceId: "src_upload",
        }),
      });

      expect(res.status).toBe(400);

      const body: unknown = await res.json();
      expect(isJsonObject(body)).toBe(true);
      if (!isJsonObject(body)) throw new Error("Expected JSON object");

      const error = body["error"];
      expect(isJsonObject(error)).toBe(true);
      if (!isJsonObject(error)) throw new Error("Expected error object");

      expect(error["code"]).toBe("SOURCE_KIND_NOT_ALLOWED");

      expect(mockUserCollection).not.toHaveBeenCalled();
      expect(mockSave).not.toHaveBeenCalled();
    } finally {
      server.close();
    }
  });

  it("fails closed (400) when source does not support schemaVersion=1 and does not attempt storage or Firestore writes", async () => {
    mockGetSource.mockResolvedValue({
      ok: true,
      source: {
        id: "src_upload",
        userId: "user_test_123",
        provider: "manual",
        sourceType: "upload",
        isActive: true,
        allowedKinds: ["file"],
        supportedSchemaVersions: [], // mismatch against schemaVersion=1
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      ref: {},
    });

    const { server, url } = await makeApp();

    try {
      const res = await fetch(url, {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "Idempotency-Key": "idem_upload_schema_mismatch",
        },
        body: JSON.stringify({
          ...baseBody,
          sourceId: "src_upload",
          schemaVersion: 1,
        }),
      });

      expect(res.status).toBe(400);

      const body: unknown = await res.json();
      expect(isJsonObject(body)).toBe(true);
      if (!isJsonObject(body)) throw new Error("Expected JSON object");

      const error = body["error"];
      expect(isJsonObject(error)).toBe(true);
      if (!isJsonObject(error)) throw new Error("Expected error object");

      expect(error["code"]).toBe("SOURCE_SCHEMA_VERSION_NOT_ALLOWED");

      expect(mockUserCollection).not.toHaveBeenCalled();
      expect(mockSave).not.toHaveBeenCalled();
    } finally {
      server.close();
    }
  });
});
