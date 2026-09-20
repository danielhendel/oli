// scripts/test/jest.setup.ts globally mocks this coordinator to a no-op.
// This file exercises the real domain gate, so unmock the implementation.
jest.unmock("@/lib/data/activity/appleHealthStepsRepairCoordinator");

import { executeAppleHealthStepsRepair } from "@/lib/data/activity/appleHealthStepsRepairCoordinator";

const mockIsDomainEnabled = jest.fn(async () => false);
const mockForcedToday = jest.fn(async () => undefined);
const mockForcedYesterday = jest.fn(async () => undefined);

jest.mock("react-native", () => ({
  Platform: { OS: "ios" },
  InteractionManager: { runAfterInteractions: (cb: () => void) => cb() },
}));

jest.mock("@/lib/integrations/appleHealth/storage", () => ({
  isAppleHealthDomainEnabled: (...a: unknown[]) => mockIsDomainEnabled(...a),
  getAppleHealthStepsAutoRepairLastCompletedAt: jest.fn(async () => null),
  setAppleHealthStepsAutoRepairLastCompletedAt: jest.fn(async () => undefined),
  getAppleHealthStepsBackfillState: jest.fn(async () => null),
  setAppleHealthStepsBackfillState: jest.fn(async () => undefined),
}));

jest.mock("@/lib/data/activity/appleHealthForcedLocalTodaySteps", () => ({
  runForcedLocalTodayAppleHealthStepsIngest: (...a: unknown[]) => mockForcedToday(...a),
}));

jest.mock("@/lib/data/activity/appleHealthForcedLocalYesterdaySteps", () => ({
  runForcedLocalYesterdayAppleHealthStepsIngest: (...a: unknown[]) => mockForcedYesterday(...a),
}));

jest.mock("@/lib/data/activity/appleHealthStepsBackfillMutex", () => ({
  runAppleHealthStepsBackfillSerialized: async (fn: () => Promise<void>) => fn(),
}));

jest.mock("@/lib/integrations/appleHealth", () => ({
  requestPermissions: jest.fn(),
  runAppleHealthStepsBackfill: jest.fn(),
  pullStepCountForLocalCalendarDay: jest.fn(),
  stepsIdempotencyKey: jest.fn(),
  APPLE_HEALTH_STEPS_BACKFILL_TRAILING_LOCAL_DAYS: 14,
}));

describe("Steps repair domain isolation", () => {
  beforeEach(() => {
    mockIsDomainEnabled.mockReset();
    mockForcedToday.mockClear();
    mockForcedYesterday.mockClear();
  });

  it("does not run Steps today/yesterday/backfill when Activity domain is disabled (Body-only)", async () => {
    mockIsDomainEnabled.mockResolvedValue(false);
    await executeAppleHealthStepsRepair({
      trigger: "connection",
      bypassCooldown: true,
      getIdToken: async () => "tok",
      userUid: "u1",
    });
    expect(mockIsDomainEnabled).toHaveBeenCalledWith("activity");
    expect(mockForcedToday).not.toHaveBeenCalled();
    expect(mockForcedYesterday).not.toHaveBeenCalled();
  });
});
