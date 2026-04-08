import { describe, it, expect, jest, beforeEach } from "@jest/globals";
import React from "react";
import renderer, { act } from "react-test-renderer";

jest.mock("@/lib/integrations/appleHealth", () => ({
  requestPermissions: jest.fn(async () => ({ ok: true as const })),
  runAppleHealthBodySync: jest.fn(async () => ({
    ok: true as const,
    ingested: 0,
    replayedOrSkipped: 0,
    samplesRead: 0,
  })),
  pullBodyCompositionSamples: jest.fn(),
  appleHealthBodyWeightIdempotencyKey: jest.fn(),
  appleHealthBodyCompositionIdempotencyKey: jest.fn(),
}));

jest.mock("@/lib/data/activity/appleHealthStepsRepairCoordinator", () => ({
  scheduleAppleHealthStepsRepair: jest.fn(),
}));

jest.mock("@/lib/integrations/appleHealth/storage", () => ({
  getAppleHealthBodyLastCheckedAt: jest.fn(async () => null),
  setAppleHealthBodyLastCheckedAt: jest.fn(async () => undefined),
  getAppleHealthConnected: jest.fn(async () => false),
  setAppleHealthConnected: jest.fn(async () => undefined),
  setLastSyncAt: jest.fn(async () => undefined),
}));

jest.mock("@/lib/auth/AuthProvider", () => ({
  useAuth: () => ({
    user: { uid: "test-user" },
    getIdToken: jest.fn(async () => "token"),
  }),
}));

import { scheduleAppleHealthStepsRepair } from "@/lib/data/activity/appleHealthStepsRepairCoordinator";
import { requestPermissions, runAppleHealthBodySync } from "@/lib/integrations/appleHealth";
import { useAppleHealthBodySync } from "../useAppleHealthBodySync";

function Host() {
  useAppleHealthBodySync();
  return null;
}

describe("useAppleHealthBodySync", () => {
  const perm = jest.mocked(requestPermissions);
  const sync = jest.mocked(runAppleHealthBodySync);
  const scheduleRepair = jest.mocked(scheduleAppleHealthStepsRepair);

  beforeEach(() => {
    perm.mockClear();
    sync.mockClear();
    scheduleRepair.mockClear();
    perm.mockResolvedValue({ ok: true });
    sync.mockResolvedValue({
      ok: true,
      ingested: 0,
      replayedOrSkipped: 0,
      samplesRead: 0,
    });
  });

  it("calls requestPermissions before runAppleHealthBodySync", async () => {
    await act(async () => {
      renderer.create(React.createElement(Host));
    });
    await act(async () => {
      await new Promise<void>((r) => setImmediate(r));
    });
    expect(perm.mock.calls.length).toBeGreaterThanOrEqual(1);
    expect(sync.mock.calls.length).toBeGreaterThanOrEqual(1);
    expect(perm.mock.invocationCallOrder[0]).toBeLessThan(sync.mock.invocationCallOrder[0]!);
  });

  it("does not run body sync when HealthKit permission is denied", async () => {
    perm.mockResolvedValueOnce({ ok: false, error: "denied" });
    await act(async () => {
      renderer.create(React.createElement(Host));
    });
    await act(async () => {
      await new Promise<void>((r) => setImmediate(r));
    });
    expect(perm).toHaveBeenCalled();
    expect(sync).not.toHaveBeenCalled();
  });

  it("schedules automatic steps repair when Apple Health was not connected before a successful sync", async () => {
    await act(async () => {
      renderer.create(React.createElement(Host));
    });
    await act(async () => {
      await new Promise<void>((r) => setImmediate(r));
    });
    expect(scheduleRepair).toHaveBeenCalledWith(
      expect.objectContaining({
        trigger: "connection",
        bypassCooldown: true,
      }),
    );
  });
});
