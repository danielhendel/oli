import {
  connectAppleHealthBodyForComposition,
  APPLE_HEALTH_BODY_CONNECT_TRIGGER,
} from "@/lib/data/body/connectAppleHealthBodyForComposition";

const mockRequestBody = jest.fn();
const mockRequestBroad = jest.fn();
const mockEnableBody = jest.fn();
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
  enableAppleHealthDomain: (...a: unknown[]) => mockEnableBody(...a),
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
    mockEnableBody.mockReset();
    mockSync.mockReset();
    mockBackfill.mockReset();
    mockScheduleSteps.mockReset();
  });

  it("enables Body domain only, syncs latest, imports history without Steps repair", async () => {
    mockRequestBody.mockResolvedValue({ ok: true });
    mockEnableBody.mockResolvedValue(undefined);
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
    if (result.ok) {
      expect(result.sourceState).toBe("connected");
      expect(result.historyState).toBe("complete");
    }
    expect(mockRequestBody).toHaveBeenCalledTimes(1);
    expect(mockRequestBroad).not.toHaveBeenCalled();
    expect(mockEnableBody).toHaveBeenCalledWith("body");
    expect(mockSync).toHaveBeenCalledTimes(1);
    expect(mockBackfill).toHaveBeenCalledTimes(1);
    expect(mockScheduleSteps).not.toHaveBeenCalled();
    expect(APPLE_HEALTH_BODY_CONNECT_TRIGGER).toBe("body_connect");
    expect(phases[0]).toBe("requestingPermission");
  });

  it("keeps source connected when history fails after latest succeeds", async () => {
    mockRequestBody.mockResolvedValue({ ok: true });
    mockEnableBody.mockResolvedValue(undefined);
    mockSync.mockResolvedValue({ ok: true, ingested: 1, replayedOrSkipped: 0, samplesRead: 1 });
    mockBackfill.mockResolvedValue({
      ok: false,
      error: "chunk failed",
      requestId: null,
    });
    const onLatest = jest.fn();
    const result = await connectAppleHealthBodyForComposition({
      getIdToken: async () => "tok",
      onLatestSynced: onLatest,
    });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.sourceState).toBe("connected");
      expect(result.historyState).toBe("failed");
      expect(result.phase).toBe("historyIncomplete");
    }
    expect(onLatest).toHaveBeenCalled();
    expect(mockScheduleSteps).not.toHaveBeenCalled();
  });
});
