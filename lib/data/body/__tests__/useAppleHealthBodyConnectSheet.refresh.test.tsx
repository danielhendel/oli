import { describe, it, expect, jest, beforeEach } from "@jest/globals";
import React from "react";
import renderer, { act } from "react-test-renderer";

const mockSyncLatest = jest.fn(async () => ({ ok: true as const, ingested: 1 }));
const mockGetLastChecked = jest.fn(async () => "2026-09-19T18:00:00.000Z");
const mockGetBackfill = jest.fn(async () => null);
const mockConnect = jest.fn();
const mockResume = jest.fn();

jest.mock("react-native", () => ({
  Linking: { openSettings: jest.fn() },
}));

jest.mock("@react-native-community/netinfo", () => ({
  useNetInfo: () => ({ isConnected: true, isInternetReachable: true }),
}));

jest.mock("@/lib/auth/AuthProvider", () => ({
  useAuth: () => ({
    user: { uid: "u1" },
    getIdToken: jest.fn(async () => "tok"),
  }),
}));

jest.mock("@/lib/data/body/connectAppleHealthBodyForComposition", () => ({
  connectAppleHealthBodyForComposition: (...a: unknown[]) => mockConnect(...a),
  resumeAppleHealthBodyHistoryImport: (...a: unknown[]) => mockResume(...a),
  syncAppleHealthBodyLatestForComposition: (...a: unknown[]) => mockSyncLatest(...a),
}));

jest.mock("@/lib/integrations/appleHealth/storage", () => ({
  getAppleHealthBodyBackfillState: (...a: unknown[]) => mockGetBackfill(...a),
  getAppleHealthBodyLastCheckedAt: (...a: unknown[]) => mockGetLastChecked(...a),
}));

import { useAppleHealthBodyConnectSheet } from "../useAppleHealthBodyConnectSheet";

function Host({
  onReady,
  accessPhase = "ready",
}: {
  onReady: (api: ReturnType<typeof useAppleHealthBodyConnectSheet>) => void;
  accessPhase?: string;
}) {
  const api = useAppleHealthBodyConnectSheet({
    accessPhase,
    onDataMaybeChanged: jest.fn(),
    refreshAccess: jest.fn(async () => undefined),
  });
  React.useEffect(() => {
    onReady(api);
  }, [api, onReady]);
  return null;
}

async function mountSheet(accessPhase = "ready") {
  let api: ReturnType<typeof useAppleHealthBodyConnectSheet> | null = null;
  await act(async () => {
    renderer.create(
      React.createElement(Host, {
        accessPhase,
        onReady: (next) => {
          api = next;
        },
      }),
    );
  });
  // Allow storage hydration effect to settle.
  await act(async () => {
    await Promise.resolve();
  });
  if (!api) throw new Error("hook api not ready");
  return api;
}

describe("useAppleHealthBodyConnectSheet latest refresh", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockSyncLatest.mockResolvedValue({ ok: true, ingested: 1 });
    mockGetLastChecked.mockResolvedValue("2026-09-19T18:00:00.000Z");
    mockGetBackfill.mockResolvedValue(null);
  });

  it("opens connected sheet and refreshes latest exactly once per open", async () => {
    const api = await mountSheet();
    expect(mockSyncLatest).not.toHaveBeenCalled();

    await act(async () => {
      api.onPressCardConnection();
    });
    await act(async () => {
      await Promise.resolve();
    });
    expect(mockSyncLatest).toHaveBeenCalledTimes(1);
    expect(mockSyncLatest.mock.calls[0]?.[1]).toEqual({ trigger: "body_status_sheet_open" });

    await act(async () => {
      api.onPressCardConnection();
    });
    expect(mockSyncLatest).toHaveBeenCalledTimes(1);

    await act(async () => {
      api.close();
    });
    await act(async () => {
      api.onPressCardConnection();
    });
    await act(async () => {
      await Promise.resolve();
    });
    expect(mockSyncLatest).toHaveBeenCalledTimes(2);
  });

  it("pull-to-refresh uses pull trigger and does not start history", async () => {
    const api = await mountSheet();
    await act(async () => {
      api.onPressCardConnection();
    });
    await act(async () => {
      await Promise.resolve();
    });
    mockSyncLatest.mockClear();

    await act(async () => {
      await api.onRefreshLatest();
    });
    expect(mockSyncLatest).toHaveBeenCalledTimes(1);
    expect(mockSyncLatest.mock.calls[0]?.[1]).toEqual({ trigger: "pull_to_refresh" });
    expect(mockConnect).not.toHaveBeenCalled();
    expect(mockResume).not.toHaveBeenCalled();
  });

  it("needsReview does not auto-query latest", async () => {
    const api = await mountSheet("denied");
    await act(async () => {
      api.onPressCardConnection();
    });
    await act(async () => {
      await Promise.resolve();
    });
    expect(mockSyncLatest).not.toHaveBeenCalled();
  });
});
