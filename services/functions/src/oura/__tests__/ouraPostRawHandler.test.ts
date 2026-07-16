/**
 * Unit tests: Oura post-raw handler (runOuraPostRaw) writes snapshots + metadata.
 */
import { logger } from "firebase-functions";
import { runOuraPostRaw } from "../ouraPostRawHandler";
import { assertOuraTelemetryPrivacy } from "../../../../api/src/lib/testSupport/assertOuraTelemetryPrivacy";

const mockSet = jest.fn().mockResolvedValue(undefined);
const mockCommit = jest.fn().mockResolvedValue(undefined);
const mockBatchSet = jest.fn().mockReturnThis();

const mockReadinessDocGet = jest.fn().mockResolvedValue({ exists: false });
const mockReadinessQueryGet = jest.fn().mockResolvedValue({ docs: [] });

jest.mock("firebase-admin/firestore", () => ({
  getFirestore: jest.fn(() => ({
    collection: jest.fn(() => ({
      doc: jest.fn(() => ({
        collection: jest.fn(() => ({
          doc: jest.fn(() => ({
            set: mockSet,
            get: mockReadinessDocGet,
          })),
          where: jest.fn(() => ({
            limit: jest.fn(() => ({ get: mockReadinessQueryGet })),
          })),
        })),
        set: mockSet,
      })),
    })),
    batch: jest.fn(() => ({ set: mockBatchSet, commit: mockCommit })),
  })),
  FieldValue: { serverTimestamp: () => ({ _serverTimestamp: true }) },
}));

jest.mock("firebase-functions", () => ({
  logger: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  },
}));

function assertCapturedLoggerPrivacy(): void {
  for (const method of ["info", "warn", "error"] as const) {
    for (const call of (logger[method] as jest.Mock).mock.calls) {
      assertOuraTelemetryPrivacy(call[0]);
    }
  }
}

describe("runOuraPostRaw", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockSet.mockResolvedValue(undefined);
    mockCommit.mockResolvedValue(undefined);
  });

  afterEach(() => {
    assertCapturedLoggerPrivacy();
  });

  it("writes integration metadata with lastRefreshAt even when zero snapshots", async () => {
    const result = await runOuraPostRaw("uid1", "req1", [], []);

    expect(result.metadataWritten).toBe(true);
    expect(result.sleepWritten).toBe(0);
    expect(result.sleepNightsWritten).toBe(0);
    expect(result.readinessWritten).toBe(0);
    expect(result.stressWritten).toBe(0);
    expect(mockSet).toHaveBeenCalled();
    const setCalls = mockSet.mock.calls;
    const integrationUpdate = setCalls.find(
      (c: [Record<string, unknown>]) => c[0] && "lastRefreshAt" in c[0],
    );
    expect(integrationUpdate).toBeDefined();
    expect(integrationUpdate[0]).toHaveProperty("lastRefreshAt");
    expect(integrationUpdate[0]).not.toHaveProperty("lastSyncAt");
    expect(integrationUpdate[0]).not.toHaveProperty("lastSnapshotAt");
  });

  it("writes readiness + sleep snapshots and metadata with lastSyncAt/lastSnapshotAt", async () => {
    const sleepDocs = [
      { id: "s1", bed_time: "2025-03-13T22:00:00Z", wake_time: "2025-03-14T06:00:00Z" },
    ];
    const readinessDocs = [{ id: "r1", day: "2025-03-14", timestamp: "2025-03-14T08:00:00Z" }];

    const result = await runOuraPostRaw("uid2", "req2", sleepDocs, readinessDocs);

    expect(result.sleepWritten).toBeGreaterThanOrEqual(1);
    expect(result.sleepNightsWritten).toBeGreaterThanOrEqual(1);
    expect(result.readinessWritten).toBeGreaterThanOrEqual(1);
    expect(result.metadataWritten).toBe(true);
    const setCalls = mockSet.mock.calls;
    const integrationUpdate = setCalls.find(
      (c: [Record<string, unknown>]) => c[0] && "lastRefreshAt" in c[0],
    );
    expect(integrationUpdate).toBeDefined();
    expect(integrationUpdate[0]).toHaveProperty("lastSyncAt");
    expect(integrationUpdate[0]).toHaveProperty("lastSnapshotAt");
  });

  it("sleep extraction is observable when zero written (docs missing day)", async () => {
    const sleepDocsNoDay = [{ id: "s1" }];
    const readinessDocs = [{ id: "r1", day: "2025-03-14" }];

    const result = await runOuraPostRaw("uid3", "req3", sleepDocsNoDay, readinessDocs);

    expect(result.sleepWritten).toBe(0);
    expect(result.sleepNightsWritten).toBe(0);
    expect(result.readinessWritten).toBeGreaterThanOrEqual(1);
    expect(result.metadataWritten).toBe(true);
  });

  it("score undefined does not crash Firestore write (Firestore-safe payload)", async () => {
    const sleepDocs = [
      { id: "s1", bed_time: "2025-03-13T22:00:00Z", wake_time: "2025-03-14T06:00:00Z" },
    ];
    const readinessDocs = [{ id: "r1", day: "2025-03-14" }];

    const result = await runOuraPostRaw("uid4", "req4", sleepDocs, readinessDocs);

    expect(result.sleepWritten).toBeGreaterThanOrEqual(1);
    expect(result.sleepNightsWritten).toBeGreaterThanOrEqual(1);
    expect(result.readinessWritten).toBeGreaterThanOrEqual(1);
    expect(result.metadataWritten).toBe(true);
    const setCalls = mockSet.mock.calls;
    const payloads = setCalls.map((c: [Record<string, unknown>]) => c[0]);
    for (const p of payloads) {
      expect(Object.values(p).every((v) => v !== undefined)).toBe(true);
    }
  });

  it("metadata still updates when at least one snapshot is written", async () => {
    const sleepDocs = [
      { id: "s1", bed_time: "2025-03-13T22:00:00Z", wake_time: "2025-03-14T06:00:00Z" },
    ];
    const readinessDocs: { id?: string; day?: string }[] = [];

    const result = await runOuraPostRaw("uid5", "req5", sleepDocs, readinessDocs);

    expect(result.sleepWritten).toBeGreaterThanOrEqual(1);
    expect(result.sleepNightsWritten).toBeGreaterThanOrEqual(1);
    expect(result.readinessWritten).toBe(0);
    expect(result.metadataWritten).toBe(true);
  });

  it("sleep snapshot includes Firestore-safe contributors when doc has metrics", async () => {
    const sleepDocs = [
      {
        id: "s1",
        bed_time: "2025-03-13T22:00:00Z",
        wake_time: "2025-03-14T06:00:00Z",
        total_sleep_duration: 28800,
        efficiency: 88,
        latency: 420,
        restful_sleep: 82,
        rem_sleep_duration: 5400,
        deep_sleep_duration: 2700,
      },
    ];
    const readinessDocs = [{ id: "r1", day: "2025-03-14" }];

    const result = await runOuraPostRaw("uid6", "req6", sleepDocs, readinessDocs);

    expect(result.sleepWritten).toBeGreaterThanOrEqual(1);
    expect(result.sleepNightsWritten).toBeGreaterThanOrEqual(1);
    const batchSetCalls = mockBatchSet.mock.calls as [unknown, Record<string, unknown>, unknown][];
    /** Rollup day = wake UTC (2025-03-14), not bedtime UTC (2025-03-13). */
    const sleepPayload = batchSetCalls.find((c) => c[1]?.source === "oura" && c[1]?.day === "2025-03-14")?.[1];
    expect(sleepPayload).toBeDefined();
    const sleepNightPayload = batchSetCalls.find((c) => c[1]?.source === "ouraVendorSleep")?.[1];
    expect(sleepNightPayload).toBeDefined();
    expect(sleepNightPayload?.anchorDay).toBe("2025-03-14");
    expect(sleepNightPayload?.isComplete).toBe(true);
    expect(sleepPayload?.contributors).toBeDefined();
    expect(typeof sleepPayload?.contributors).toBe("object");
    const contrib = sleepPayload?.contributors as Record<string, unknown>;
    expect(Object.keys(contrib).length).toBeGreaterThan(0);
    expect(Object.values(contrib).every((v) => typeof v === "number")).toBe(true);
    expect(Object.values(sleepPayload!).every((v) => v !== undefined)).toBe(true);
  });

  it("infers end from start + total_sleep_duration and writes sleepNight on rollup day", async () => {
    const sleepDocs = [
      {
        id: "s_infer",
        day: "2026-05-14",
        bedtime_start: "2026-05-13T23:00:00.000Z",
        total_sleep_duration: 24600,
        efficiency: 91,
        rem_sleep_duration: 4800,
        deep_sleep_duration: 3120,
        score: 81,
      },
    ];
    const readinessDocs = [{ id: "r1", day: "2026-05-14", timestamp: "2026-05-14T08:00:00Z" }];

    const result = await runOuraPostRaw("uid7", "req7", sleepDocs, readinessDocs);

    expect(result.sleepWritten).toBeGreaterThanOrEqual(1);
    expect(result.sleepNightsWritten).toBeGreaterThanOrEqual(1);
    const batchSetCalls = mockBatchSet.mock.calls as [unknown, Record<string, unknown>, unknown][];
    const sleepPayload = batchSetCalls.find((c) => c[1]?.source === "oura" && c[1]?.day === "2026-05-14")?.[1];
    expect(sleepPayload).toBeDefined();
    const sleepNightPayload = batchSetCalls.find(
      (c) => c[1]?.source === "ouraVendorSleep" && c[1]?.anchorDay === "2026-05-14",
    )?.[1];
    expect(sleepNightPayload?.isComplete).toBe(true);
    expect(sleepNightPayload?.score).toBe(81);
  });

  it("tolerates absent dailyStressDocs (old producers) and reports stressWritten 0", async () => {
    const sleepDocs = [
      { id: "s1", bed_time: "2025-03-13T22:00:00Z", wake_time: "2025-03-14T06:00:00Z" },
    ];
    const readinessDocs = [{ id: "r1", day: "2025-03-14" }];

    const result = await runOuraPostRaw("uid8", "req8", sleepDocs, readinessDocs);

    expect(result.stressWritten).toBe(0);
    expect(result.metadataWritten).toBe(true);
  });

  it("persists stress snapshots when dailyStressDocs are present", async () => {
    const stressDocs = [
      {
        id: "st1",
        day: "2025-03-14",
        day_summary: "normal" as const,
        stress_high: 120,
        recovery_high: 60,
      },
    ];

    const result = await runOuraPostRaw("uid9", "req9", [], [], [], stressDocs);

    expect(result.stressWritten).toBeGreaterThanOrEqual(1);
    expect(result.metadataWritten).toBe(true);
    const batchSetCalls = mockBatchSet.mock.calls as [unknown, Record<string, unknown>, unknown][];
    const stressPayload = batchSetCalls.find(
      (c) => c[1]?.source === "oura" && c[1]?.schemaVersion === 1 && c[1]?.day === "2025-03-14",
    )?.[1];
    expect(stressPayload).toBeDefined();
    expect(stressPayload?.daySummary).toBe("normal");
    expect(stressPayload?.stressHighSeconds).toBe(120);
    expect(stressPayload?.recoveryHighSeconds).toBe(60);
    expect(stressPayload).not.toHaveProperty("payload");
  });
});
