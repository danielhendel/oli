import { connectAppleHealthForOnboarding } from "../appleHealthOnboardingConnect";

jest.mock("react-native", () => ({
  Platform: { OS: "ios" },
}));

const mockRequestPermissions = jest.fn();
const mockRunSync = jest.fn();
const mockGetConnected = jest.fn();
const mockEnableAll = jest.fn();
const mockGetNotAvailable = jest.fn();
const mockScheduleRepair = jest.fn();

jest.mock("@/lib/integrations/appleHealth", () => ({
  requestPermissions: (...args: unknown[]) => mockRequestPermissions(...args),
  runAppleHealthBodySync: (...args: unknown[]) => mockRunSync(...args),
  pullBodyCompositionSamples: jest.fn(),
  appleHealthBodyWeightIdempotencyKey: jest.fn(),
  appleHealthBodyCompositionIdempotencyKey: jest.fn(),
}));

jest.mock("@/lib/integrations/appleHealth/storage", () => ({
  getAppleHealthConnected: (...args: unknown[]) => mockGetConnected(...args),
  enableAllImplementedAppleHealthDomains: (...args: unknown[]) => mockEnableAll(...args),
  getAppleHealthNotAvailable: (...args: unknown[]) => mockGetNotAvailable(...args),
  setAppleHealthBodyLastCheckedAt: jest.fn(async () => undefined),
  setLastSyncAt: jest.fn(async () => undefined),
}));

jest.mock("@/lib/api/ingest", () => ({
  ingestRawEvent: jest.fn(),
}));

jest.mock("@/lib/data/activity/appleHealthStepsRepairCoordinator", () => ({
  scheduleAppleHealthStepsRepair: (...args: unknown[]) => mockScheduleRepair(...args),
}));

describe("connectAppleHealthForOnboarding", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGetNotAvailable.mockResolvedValue(false);
    mockGetConnected.mockResolvedValue(false);
    mockRequestPermissions.mockResolvedValue({ ok: true });
    mockRunSync.mockResolvedValue({ ok: true, ingested: 0, replayedOrSkipped: 0, samplesRead: 0 });
    mockEnableAll.mockResolvedValue(undefined);
  });

  it("enables all implemented domains after permissions succeed", async () => {
    const result = await connectAppleHealthForOnboarding({
      getIdToken: async () => "token",
      userUid: "u1",
    });
    expect(result.ok).toBe(true);
    expect(mockRequestPermissions).toHaveBeenCalled();
    expect(mockEnableAll).toHaveBeenCalled();
    expect(mockRunSync).toHaveBeenCalled();
    expect(mockScheduleRepair).toHaveBeenCalled();
  });

  it("does not enable domains when permission denied", async () => {
    mockRequestPermissions.mockResolvedValue({ ok: false, error: "denied" });
    const result = await connectAppleHealthForOnboarding({
      getIdToken: async () => "token",
    });
    expect(result).toEqual({ ok: false, reason: "permission_denied" });
    expect(mockEnableAll).not.toHaveBeenCalled();
    expect(mockRunSync).not.toHaveBeenCalled();
  });

  it("keeps account connected when initial sync fails after permission grant", async () => {
    mockRunSync.mockResolvedValue({ ok: false, error: "ingest failed" });
    const result = await connectAppleHealthForOnboarding({
      getIdToken: async () => "token",
      userUid: "u1",
    });
    expect(result.ok).toBe(true);
    expect(mockEnableAll).toHaveBeenCalled();
  });
});
