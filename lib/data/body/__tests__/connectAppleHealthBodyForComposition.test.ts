import {
  connectAppleHealthBodyForComposition,
} from "@/lib/data/body/connectAppleHealthBodyForComposition";

const mockRequestBody = jest.fn();
const mockRequestBroad = jest.fn();
const mockSetConnected = jest.fn();
const mockSync = jest.fn();
const mockBackfill = jest.fn();
const mockScheduleSteps = jest.fn();

jest.mock("react-native", () => ({
  Platform: { OS: "ios" },
}));

jest.mock("@/lib/integrations/appleHealth", () => ({
  requestBodyCompositionPermissions: (...a: unknown[]) => mockRequestBody(...a),
  requestPermissions: (...a: unknown[]) => mockRequestBroad(...a),
  pullBodyCompositionSamples: jest.fn(),
  appleHealthBodyWeightIdempotencyKey: jest.fn(),
  appleHealthBodyCompositionIdempotencyKey: jest.fn(),
  runAppleHealthBodySync: (...a: unknown[]) => mockSync(...a),
  runAppleHealthBodyBackfill: (...a: unknown[]) => mockBackfill(...a),
}));

jest.mock("@/lib/integrations/appleHealth/storage", () => ({
  getAppleHealthConnected: jest.fn(async () => false),
  getAppleHealthNotAvailable: jest.fn(async () => false),
  setAppleHealthConnected: (...a: unknown[]) => mockSetConnected(...a),
  setAppleHealthBodyLastCheckedAt: jest.fn(async () => undefined),
  setLastSyncAt: jest.fn(async () => undefined),
  getAppleHealthBodyBackfillState: jest.fn(),
  setAppleHealthBodyBackfillState: jest.fn(),
}));

jest.mock("@/lib/api/ingest", () => ({
  ingestRawEvent: jest.fn(),
}));

jest.mock("@/lib/data/activity/appleHealthStepsRepairCoordinator", () => ({
  scheduleAppleHealthStepsRepair: (...a: unknown[]) => mockScheduleSteps(...a),
}));

describe("connectAppleHealthBodyForComposition", () => {
  beforeEach(() => {
    mockRequestBody.mockReset();
    mockRequestBroad.mockReset();
    mockSetConnected.mockReset();
    mockSync.mockReset();
    mockBackfill.mockReset();
    mockScheduleSteps.mockReset();
  });

  it("requests Body-only permissions, syncs latest, then imports history without Steps repair", async () => {
    mockRequestBody.mockResolvedValue({ ok: true });
    mockSetConnected.mockResolvedValue(undefined);
    mockSync.mockResolvedValue({ ok: true, ingested: 2, replayedOrSkipped: 0, samplesRead: 2 });
    mockBackfill.mockResolvedValue({
      ok: true,
      status: "completed",
      startedAt: "t0",
      completedAt: "t1",
      chunkCount: 1,
      samplesRead: 5,
      samplesIngested: 3,
      samplesSkippedDuplicate: 0,
      lastProcessedDate: null,
    });
    const phases: string[] = [];
    const result = await connectAppleHealthBodyForComposition({
      getIdToken: async () => "tok",
      onPhase: (p) => phases.push(p),
    });
    expect(result.ok).toBe(true);
    expect(mockRequestBody).toHaveBeenCalledTimes(1);
    expect(mockRequestBroad).not.toHaveBeenCalled();
    expect(mockSetConnected).toHaveBeenCalledWith(true);
    expect(mockSync).toHaveBeenCalledTimes(1);
    expect(mockBackfill).toHaveBeenCalledTimes(1);
    expect(mockScheduleSteps).not.toHaveBeenCalled();
    expect(phases[0]).toBe("requestingPermission");
    expect(phases).toContain("findingLatest");
    expect(phases).toContain("importingEarlier");
  });

  it("does not call HealthKit when unavailable", async () => {
    const storage = require("@/lib/integrations/appleHealth/storage");
    storage.getAppleHealthNotAvailable.mockResolvedValueOnce(true);
    const result = await connectAppleHealthBodyForComposition({
      getIdToken: async () => "tok",
    });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reason).toBe("unavailable");
    expect(mockRequestBody).not.toHaveBeenCalled();
  });
});
