/**
 * Body page latest sync: Body domain gate; no auth re-prompt; no Steps dispatch.
 */
import { describe, it, expect, jest, beforeEach } from "@jest/globals";
import React from "react";
import renderer, { act } from "react-test-renderer";

const mockSyncLatest = jest.fn(async () => ({ ok: true as const, ingested: 0 }));
const mockIsDomainEnabled = jest.fn(async () => false);
const mockGetLastChecked = jest.fn(async () => null);
const mockScheduleSteps = jest.fn();
const mockGetIdToken = jest.fn(async () => "token");

jest.mock("@react-navigation/native", () => {
  const ReactLocal = require("react") as typeof import("react");
  return {
    useFocusEffect: (cb: () => void | (() => void)) => {
      ReactLocal.useEffect(() => {
        const cleanup = cb();
        return typeof cleanup === "function" ? cleanup : undefined;
      }, [cb]);
    },
  };
});

jest.mock("@react-native-community/netinfo", () => ({
  useNetInfo: () => ({ isConnected: true, isInternetReachable: true }),
}));

jest.mock("@/lib/data/body/connectAppleHealthBodyForComposition", () => ({
  syncAppleHealthBodyLatestForComposition: (...a: unknown[]) => mockSyncLatest(...a),
}));

jest.mock("@/lib/data/activity/appleHealthStepsRepairCoordinator", () => ({
  scheduleAppleHealthStepsRepair: (...a: unknown[]) => mockScheduleSteps(...a),
}));

jest.mock("@/lib/integrations/appleHealth/storage", () => ({
  getAppleHealthBodyLastCheckedAt: (...a: unknown[]) => mockGetLastChecked(...a),
  isAppleHealthDomainEnabled: (...a: unknown[]) => mockIsDomainEnabled(...a),
}));

jest.mock("@/lib/auth/AuthProvider", () => ({
  useAuth: () => ({
    user: { uid: "test-user" },
    getIdToken: mockGetIdToken,
  }),
}));

jest.mock("@/lib/sync/throttle", () => ({
  shouldRun: () => true,
}));

import { useAppleHealthBodySync } from "../useAppleHealthBodySync";

function Host() {
  useAppleHealthBodySync();
  return null;
}

describe("useAppleHealthBodySync permissions / domain gate", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockSyncLatest.mockResolvedValue({ ok: true, ingested: 0 });
    mockIsDomainEnabled.mockResolvedValue(false);
    mockGetLastChecked.mockResolvedValue(null);
  });

  it("does not sync when Body domain is not enabled", async () => {
    mockIsDomainEnabled.mockResolvedValue(false);
    await act(async () => {
      renderer.create(React.createElement(Host));
    });
    await act(async () => {
      await Promise.resolve();
    });
    expect(mockSyncLatest).not.toHaveBeenCalled();
    expect(mockScheduleSteps).not.toHaveBeenCalled();
  });

  it("runs latest Body sync without Steps when Body domain enabled", async () => {
    mockIsDomainEnabled.mockResolvedValue(true);
    await act(async () => {
      renderer.create(React.createElement(Host));
    });
    await act(async () => {
      await Promise.resolve();
    });
    expect(mockIsDomainEnabled).toHaveBeenCalledWith("body");
    expect(mockSyncLatest).toHaveBeenCalled();
    expect(mockScheduleSteps).not.toHaveBeenCalled();
  });
});
