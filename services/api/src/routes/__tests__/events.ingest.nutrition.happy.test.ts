// services/api/src/routes/__tests__/events.ingest.nutrition.happy.test.ts
import { describe, it, expect, jest, beforeEach, afterEach } from "@jest/globals";
import express from "express";
import type http from "http";
import { AddressInfo } from "net";

import { ingestRawEventSchema } from "../../types/events";

// Mock DB surface used by the route
const mockUserCollection = jest.fn();
const mockGetSource = jest.fn();

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

type CreateFn = (data: unknown) => Promise<void>;
type GetFn = () => Promise<{ exists: boolean; data: () => unknown }>;

type DocRef = {
  id: string;
  create: CreateFn;
  get: GetFn;
};

type CollectionRef = {
  doc: (id: string) => DocRef;
};

describe("POST /ingest - Step 7 nutrition kind (contracts-first, create-only, replay-safe)", () => {
  let server: http.Server;
  let baseUrl: string;

  beforeEach(() => {
    mockUserCollection.mockReset();
    mockGetSource.mockReset();
  });

  afterEach(async () => {
    jest.restoreAllMocks();
    if (server) await new Promise<void>((resolve) => server.close(() => resolve()));
  });

  const makeApp = async (): Promise<void> => {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const router = require("../events").default as express.Router;

    const app = express();
    app.use(express.json());
    // Minimal auth shim (route requires req.uid)
    app.use((req, _res, next) => {
      (req as unknown as { uid?: string }).uid = "user_test_123";
      next();
    });
    app.use("/ingest", router);

    server = app.listen(0);
    const addr = server.address() as AddressInfo;
    baseUrl = `http://127.0.0.1:${addr.port}`;
  };

  it("accepts nutrition payload (strict schema), writes RawEvent, returns 202 with authoritative day", async () => {
    await makeApp();

    // Source gating allows nutrition
    mockGetSource.mockResolvedValue({
      ok: true,
      source: {
        id: "src_manual_api",
        userId: "user_test_123",
        provider: "manual",
        sourceType: "api",
        isActive: true,
        allowedKinds: ["nutrition"],
        supportedSchemaVersions: [1],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      ref: {},
    });

    const createCalls: unknown[] = [];
    const docRef: DocRef = {
      id: "idem_nutrition_1",
      create: async (data: unknown) => {
        createCalls.push(data);
      },
      get: async () => ({ exists: false, data: () => null }),
    };

    const col: CollectionRef = {
      doc: (id: string) => {
        expect(id).toBe("idem_nutrition_1");
        return docRef;
      },
    };

    mockUserCollection.mockReturnValue(col);

    const bodyCandidate = {
      provider: "manual",
      kind: "nutrition",
      schemaVersion: 1,
      sourceId: "src_manual_api",
      observedAt: "2025-01-01T00:00:00.000Z",
      timeZone: "America/New_York",
      payload: {
        start: "2025-01-01T00:00:00.000Z",
        end: "2025-01-01T23:59:59.999Z",
        timezone: "America/New_York",
        totalKcal: 2200,
        proteinG: 160,
        carbsG: 200,
        fatG: 70,
        fiberG: null,
      },
    };

    // Sanity: test body is schema-valid at the contract layer
    const parsed = ingestRawEventSchema.safeParse(bodyCandidate);
    expect(parsed.success).toBe(true);

    const res = await fetch(`${baseUrl}/ingest`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "Idempotency-Key": "idem_nutrition_1",
      },
      body: JSON.stringify(bodyCandidate),
    });

    expect(res.status).toBe(202);
    const json = (await res.json()) as { ok: boolean; rawEventId: string; day: string };
    expect(json.ok).toBe(true);
    expect(json.rawEventId).toBe("idem_nutrition_1");
    // ObservedAt midnight Z is previous local day in America/New_York
    expect(json.day).toBe("2024-12-31");

    // Proof: create-only write occurred exactly once
    expect(createCalls.length).toBe(1);
    expect(createCalls[0]).toEqual(
      expect.objectContaining({
        id: "idem_nutrition_1",
        userId: "user_test_123",
        kind: "nutrition",
        schemaVersion: 1,
        sourceId: "src_manual_api",
      }),
    );
  });

  it("is idempotent: if create fails but doc exists, returns 202 with idempotentReplay=true", async () => {
    await makeApp();

    mockGetSource.mockResolvedValue({
      ok: true,
      source: {
        id: "src_manual_api",
        userId: "user_test_123",
        provider: "manual",
        sourceType: "api",
        isActive: true,
        allowedKinds: ["nutrition"],
        supportedSchemaVersions: [1],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      ref: {},
    });

    const docRef: DocRef = {
      id: "idem_nutrition_2",
      create: async () => {
        throw new Error("ALREADY_EXISTS");
      },
      get: async () => ({ exists: true, data: () => ({ id: "idem_nutrition_2" }) }),
    };

    const col: CollectionRef = {
      doc: () => docRef,
    };
    mockUserCollection.mockReturnValue(col);

    const res = await fetch(`${baseUrl}/ingest`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "Idempotency-Key": "idem_nutrition_2",
      },
      body: JSON.stringify({
        provider: "manual",
        kind: "nutrition",
        schemaVersion: 1,
        sourceId: "src_manual_api",
        observedAt: "2025-01-01T12:00:00.000Z",
        timeZone: "America/New_York",
        payload: {
          start: "2025-01-01T12:00:00.000Z",
          end: "2025-01-01T23:59:59.999Z",
          timezone: "America/New_York",
          totalKcal: 2100,
          proteinG: 150,
          carbsG: 180,
          fatG: 65,
        },
      }),
    });

    expect(res.status).toBe(202);
    const json = (await res.json()) as {
      ok: boolean;
      rawEventId: string;
      idempotentReplay?: boolean;
    };
    expect(json.ok).toBe(true);
    expect(json.rawEventId).toBe("idem_nutrition_2");
    expect(json.idempotentReplay).toBe(true);
  });
});
