/**
 * Unit tests: Oura post-raw handler (runOuraPostRaw) writes snapshots + metadata.
 */
import { runOuraPostRaw } from "../ouraPostRawHandler";

const mockSet = jest.fn().mockResolvedValue(undefined);
const mockCommit = jest.fn().mockResolvedValue(undefined);
const mockBatchSet = jest.fn().mockReturnThis();

jest.mock("firebase-admin/firestore", () => ({
  getFirestore: jest.fn(() => ({
    collection: jest.fn(() => ({
      doc: jest.fn(() => ({
        collection: jest.fn(() => ({
          doc: jest.fn(() => ({ set: mockSet })),
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
    error: jest.fn(),
  },
}));

describe("runOuraPostRaw", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockSet.mockResolvedValue(undefined);
    mockCommit.mockResolvedValue(undefined);
  });

  it("writes integration metadata with lastRefreshAt even when zero snapshots", async () => {
    const result = await runOuraPostRaw("uid1", "req1", [], []);

    expect(result.metadataWritten).toBe(true);
    expect(result.sleepWritten).toBe(0);
    expect(result.readinessWritten).toBe(0);
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
    const batchSetCalls = mockBatchSet.mock.calls as [unknown, Record<string, unknown>, unknown][];
    const sleepPayload = batchSetCalls.find((c) => c[1]?.source === "oura" && c[1]?.day === "2025-03-13")?.[1];
    expect(sleepPayload).toBeDefined();
    expect(sleepPayload?.contributors).toBeDefined();
    expect(typeof sleepPayload?.contributors).toBe("object");
    const contrib = sleepPayload?.contributors as Record<string, unknown>;
    expect(Object.keys(contrib).length).toBeGreaterThan(0);
    expect(Object.values(contrib).every((v) => typeof v === "number")).toBe(true);
    expect(Object.values(sleepPayload!).every((v) => v !== undefined)).toBe(true);
  });
});
