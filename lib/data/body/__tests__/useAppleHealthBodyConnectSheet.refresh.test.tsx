import { describe, it, expect, jest, beforeEach } from "@jest/globals";
import React from "react";
import renderer, { act } from "react-test-renderer";

const mockSyncLatest = jest.fn(async () => ({ ok: true as const, ingested: 1 }));
const mockGetLastChecked = jest.fn(async () => "2026-09-19T18:00:00.000Z");
const mockGetBackfill = jest.fn(async () => null);
const mockIsDomainEnabled = jest.fn(async () => true);
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
  isAppleHealthDomainEnabled: (...a: unknown[]) => mockIsDomainEnabled(...a),
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

type SheetApi = ReturnType<typeof useAppleHealthBodyConnectSheet>;

async function mountSheet(accessPhase = "ready") {
  const holder: { api: SheetApi | null } = { api: null };
  await act(async () => {
    renderer.create(
      React.createElement(Host, {
        accessPhase,
        onReady: (next) => {
          holder.api = next;
        },
      }),
    );
  });
  await act(async () => {
    await Promise.resolve();
    await Promise.resolve();
  });
  if (!holder.api) throw new Error("hook api not ready");
  return holder;
}

describe("useAppleHealthBodyConnectSheet — no refresh on open", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockSyncLatest.mockResolvedValue({ ok: true, ingested: 1 });
    mockGetLastChecked.mockResolvedValue("2026-09-19T18:00:00.000Z");
    mockGetBackfill.mockResolvedValue(null);
    mockIsDomainEnabled.mockResolvedValue(true);
  });

  it("opening connected sheet invokes zero latest refreshes", async () => {
    const holder = await mountSheet();
    await act(async () => {
      holder.api!.onPressCardConnection();
    });
    await act(async () => {
      await Promise.resolve();
    });
    expect(mockSyncLatest).not.toHaveBeenCalled();
    expect(mockConnect).not.toHaveBeenCalled();
    expect(mockResume).not.toHaveBeenCalled();
    expect(holder.api!.visible).toBe(true);
    expect(holder.api!.phase).toBe("connectedStatus");
  });

  it("close and reopen still does not refresh", async () => {
    const holder = await mountSheet();
    await act(async () => {
      holder.api!.onPressCardConnection();
    });
    await act(async () => {
      holder.api!.close();
    });
    await act(async () => {
      holder.api!.onPressCardConnection();
    });
    expect(mockSyncLatest).not.toHaveBeenCalled();
    expect(holder.api!.visible).toBe(true);
  });
});
