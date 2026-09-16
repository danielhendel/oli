// lib/data/body/__tests__/useAppleHealthBodySync.permissions.test.ts
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

const mockGetConnected = jest.fn(async () => false);

jest.mock("@/lib/integrations/appleHealth/storage", () => ({
  getAppleHealthBodyLastCheckedAt: jest.fn(async () => null),
  setAppleHealthBodyLastCheckedAt: jest.fn(async () => undefined),
  getAppleHealthConnected: (...args: unknown[]) => mockGetConnected(...args),
  setAppleHealthConnected: jest.fn(async () => undefined),
  setLastSyncAt: jest.fn(async () => undefined),
}));

jest.mock("@/lib/auth/AuthProvider", () => ({
  useAuth: () => ({
    user: { uid: "test-user" },
    getIdToken: jest.fn(async () => "token"),
  }),
}));

import { requestPermissions, runAppleHealthBodySync } from "@/lib/integrations/appleHealth";
import { useAppleHealthBodySync } from "../useAppleHealthBodySync";

function Host() {
  useAppleHealthBodySync();
  return null;
}

describe("useAppleHealthBodySync", () => {
  const perm = jest.mocked(requestPermissions);
  const sync = jest.mocked(runAppleHealthBodySync);

  beforeEach(() => {
    perm.mockClear();
    sync.mockClear();
    mockGetConnected.mockClear();
    mockGetConnected.mockResolvedValue(false);
    perm.mockResolvedValue({ ok: true });
    sync.mockResolvedValue({
      ok: true,
      ingested: 0,
      replayedOrSkipped: 0,
      samplesRead: 0,
    });
  });

  it("does not call requestPermissions or sync when Apple Health is not connected", async () => {
    mockGetConnected.mockResolvedValue(false);
    await act(async () => {
      renderer.create(React.createElement(Host));
    });
    await act(async () => {
      await new Promise<void>((r) => setImmediate(r));
    });
    expect(perm).not.toHaveBeenCalled();
    expect(sync).not.toHaveBeenCalled();
  });

  it("calls requestPermissions before runAppleHealthBodySync when connected", async () => {
    mockGetConnected.mockResolvedValue(true);
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
    mockGetConnected.mockResolvedValue(true);
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
});
