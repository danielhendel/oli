// services/api/src/routes/__tests__/events.ingest.source-gating.test.ts
import { describe, it, expect, jest, beforeEach, afterEach } from "@jest/globals";
import express from "express";

import { ingestRawEventSchema } from "../../types/events";

// Prove no Firestore writes happen if gating fails
const mockUserCollection = jest.fn();

// Mock sources DB lookup used by requireActiveSource
const mockGetSource = jest.fn();

type JsonObject = Record<string, unknown>;
function isJsonObject(v: unknown): v is JsonObject {
  return typeof v === "object" && v !== null;
}

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

describe("POST /ingest - Step 4 source gating (fail-closed)", () => {
  beforeEach(() => {
    mockUserCollection.mockReset();
    mockGetSource.mockReset();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  const makeApp = async (): Promise<{ server: ReturnType<express.Express["listen"]>; url: string }> => {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const router = require("../events").default as express.Router;

    const app = express();
    app.use(express.json());

    // Minimal auth shim: route requires req.uid
    app.use((req, _res, next) => {
      (req as unknown as { uid?: string }).uid = "user_test_123";
      next();
    });

    app.use("/ingest", router);

    const server = app.listen(0);
    const address = server.address();
    if (!address || typeof address === "string") {
      server.close();
      throw new Error("Failed to bind test server");
    }
    const url = `http://127.0.0.1:${address.port}/ingest`;
    return { server, url };
  };

  /**
   * Base request body that is schema-valid for ingestRawEventSchema.
   * NOTE: timeZone is NOT part of ingestRawEventSchema (it is validated separately by the route),
   * so we add timeZone only at send-time.
   */
  const baseSchemaValidBody = (() => {
    const attempt = {
      provider: "manual",
      kind: "sleep",
      schemaVersion: 1,
      sourceId: "src_manual_api",
      observedAt: "2025-01-01T00:00:00.000Z",
      payload: { any: "opaque" },
    };

    const parsed = ingestRawEventSchema.safeParse(attempt);
    if (!parsed.success) {
      throw new Error(`Test body is not schema-valid: ${JSON.stringify(parsed.error.flatten(), null, 2)}`);
    }

    return parsed.data as unknown as Record<string, unknown>;
  })();

  const withTimeZone = (body: Record<string, unknown>, timeZone: string): Record<string, unknown> => ({
    ...body,
    timeZone,
  });

  it("fails closed (400) when sourceId is missing and does not attempt Firestore writes", async () => {
    const { server, url } = await makeApp();

    try {
      const withoutSourceId: Record<string, unknown> = { ...baseSchemaValidBody };
      delete (withoutSourceId as { sourceId?: unknown }).sourceId;

      const res = await fetch(url, {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "Idempotency-Key": "idem_ingest_missing_source",
        },
        body: JSON.stringify(withTimeZone(withoutSourceId, "America/New_York")),
      });

      expect(res.status).toBe(400);

      const body: unknown = await res.json();
      expect(isJsonObject(body)).toBe(true);
      if (!isJsonObject(body)) throw new Error("Expected JSON object");

      const error = body["error"];
      expect(isJsonObject(error)).toBe(true);
      if (!isJsonObject(error)) throw new Error("Expected error object");

      expect(error["code"]).toBe("MISSING_SOURCE_ID");

      // ✅ Proof: no Firestore write attempt
      expect(mockUserCollection).not.toHaveBeenCalled();
    } finally {
      server.close();
    }
  });

  it("fails closed (404) when sourceId is invalid (unregistered) and does not attempt Firestore writes", async () => {
    // getSource returns NOT_FOUND => requireActiveSource maps to SOURCE_NOT_FOUND (404)
    mockGetSource.mockResolvedValue({ ok: false, code: "NOT_FOUND" });

    const { server, url } = await makeApp();

    try {
      const res = await fetch(url, {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "Idempotency-Key": "idem_ingest_invalid_source",
        },
        body: JSON.stringify(
          withTimeZone(
            {
              ...baseSchemaValidBody,
              sourceId: "does_not_exist",
            },
            "America/New_York",
          ),
        ),
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
    } finally {
      server.close();
    }
  });

  it("fails closed (400) when source is disabled and does not attempt Firestore writes", async () => {
    mockGetSource.mockResolvedValue({
      ok: true,
      source: {
        id: "src_manual_api",
        userId: "user_test_123",
        provider: "manual",
        sourceType: "api",
        isActive: false,
        allowedKinds: ["sleep"],
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
          "Idempotency-Key": "idem_ingest_inactive_source",
        },
        body: JSON.stringify(withTimeZone(baseSchemaValidBody, "America/New_York")),
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
    } finally {
      server.close();
    }
  });

  it("fails closed (400) when kind is not allowed by the source and does not attempt Firestore writes", async () => {
    mockGetSource.mockResolvedValue({
      ok: true,
      source: {
        id: "src_manual_api",
        userId: "user_test_123",
        provider: "manual",
        sourceType: "api",
        isActive: true,
        allowedKinds: ["steps"], // does not include "sleep"
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
          "Idempotency-Key": "idem_ingest_kind_not_allowed",
        },
        body: JSON.stringify(withTimeZone(baseSchemaValidBody, "America/New_York")),
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
    } finally {
      server.close();
    }
  });

  it("fails closed (400) when schemaVersion is not allowed by the source and does not attempt Firestore writes", async () => {
    mockGetSource.mockResolvedValue({
      ok: true,
      source: {
        id: "src_manual_api",
        userId: "user_test_123",
        provider: "manual",
        sourceType: "api",
        isActive: true,
        allowedKinds: ["sleep"],
        supportedSchemaVersions: [], // does not include 1
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
          "Idempotency-Key": "idem_ingest_schema_not_allowed",
        },
        body: JSON.stringify(withTimeZone(baseSchemaValidBody, "America/New_York")),
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
    } finally {
      server.close();
    }
  });

  it("fails closed (400) when provider does not match registered source provider and does not attempt Firestore writes", async () => {
    // Request provider must be "manual" (schema). To force mismatch, return a registered source with a different provider.
    mockGetSource.mockResolvedValue({
      ok: true,
      source: {
        id: "src_manual_api",
        userId: "user_test_123",
        provider: "fitbit", // mismatch vs request provider "manual"
        sourceType: "api",
        isActive: true,
        allowedKinds: ["sleep"],
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
          "Idempotency-Key": "idem_ingest_provider_mismatch",
        },
        body: JSON.stringify(withTimeZone(baseSchemaValidBody, "America/New_York")),
      });

      expect(res.status).toBe(400);

      const body: unknown = await res.json();
      expect(isJsonObject(body)).toBe(true);
      if (!isJsonObject(body)) throw new Error("Expected JSON object");

      const error = body["error"];
      expect(isJsonObject(error)).toBe(true);
      if (!isJsonObject(error)) throw new Error("Expected error object");

      expect(error["code"]).toBe("SOURCE_PROVIDER_MISMATCH");

      // ✅ Proof: provider mismatch rejects before any Firestore write attempt
      expect(mockUserCollection).not.toHaveBeenCalled();
    } finally {
      server.close();
    }
  });
});
