import { describe, it, expect, jest, beforeEach } from "@jest/globals";
import React from "react";
import renderer, { act } from "react-test-renderer";

const mockSyncLatest = jest.fn(async () => ({ ok: true as const, ingested: 1 }));
const mockGetLastChecked = jest.fn(async () => "2026-09-19T18:00:00.000Z");
const mockGetBackfill = jest.fn(async () => null);
const mockGetBodyFatBackfill = jest.fn(async () => null);
const mockIsDomainEnabled = jest.fn(async () => true);
const mockGetConnected = jest.fn(async () => true);
const mockGetMetricLast = jest.fn(async () => null);
const mockConnectMetric = jest.fn();
const mockResume = jest.fn();
const mockResolveFlags = jest.fn(async () => ({
  weight: true,
  bodyFat: true,
  leanTissue: true,
}));
const mockSetMetric = jest.fn(async () => ({ ok: true as const }));

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
  connectAppleHealthBodyMetricForComposition: (...a: unknown[]) => mockConnectMetric(...a),
  resumeAppleHealthBodyHistoryImport: (...a: unknown[]) => mockResume(...a),
  syncAppleHealthBodyLatestForComposition: (...a: unknown[]) => mockSyncLatest(...a),
}));

jest.mock("@/lib/integrations/appleHealth", () => ({
  requestAppleHealthReadPermissions: jest.fn(async () => ({ ok: true })),
}));

jest.mock("@/lib/integrations/appleHealth/storage", () => ({
  getAppleHealthBodyBackfillState: (...a: unknown[]) => mockGetBackfill(...a),
  getAppleHealthBodyFatBackfillState: (...a: unknown[]) => mockGetBodyFatBackfill(...a),
  getAppleHealthBodyLastCheckedAt: (...a: unknown[]) => mockGetLastChecked(...a),
  getAppleHealthConnected: (...a: unknown[]) => mockGetConnected(...a),
  getAppleHealthMetricLastCheckedMap: (...a: unknown[]) => mockGetMetricLast(...a),
  isAppleHealthDomainEnabled: (...a: unknown[]) => mockIsDomainEnabled(...a),
}));

jest.mock("@/lib/integrations/appleHealth/appleHealthMetricSyncController", () => ({
  resolveBodyMetricSyncFlags: (...a: unknown[]) => mockResolveFlags(...a),
  setAppleHealthMetricSyncEnabled: (...a: unknown[]) => mockSetMetric(...a),
}));

import { useAppleHealthBodyConnectSheet } from "../useAppleHealthBodyConnectSheet";

type SheetApi = ReturnType<typeof useAppleHealthBodyConnectSheet>;

function Host({
  onReady,
  accessPhase = "ready",
}: {
  onReady: (api: SheetApi) => void;
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

describe("useAppleHealthBodyConnectSheet — metric-specific, no refresh on open", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockSyncLatest.mockResolvedValue({ ok: true, ingested: 1 });
    mockGetLastChecked.mockResolvedValue("2026-09-19T18:00:00.000Z");
    mockGetBackfill.mockResolvedValue(null);
    mockIsDomainEnabled.mockResolvedValue(true);
    mockGetConnected.mockResolvedValue(true);
    mockResolveFlags.mockResolvedValue({ weight: true, bodyFat: true, leanTissue: true });
  });

  it("opening Weight sheet invokes zero latest refreshes and sets activeMetric", async () => {
    const holder = await mountSheet();
    await act(async () => {
      holder.api!.onPressCardConnection("weight");
    });
    await act(async () => {
      await Promise.resolve();
    });
    expect(mockSyncLatest).not.toHaveBeenCalled();
    expect(mockConnectMetric).not.toHaveBeenCalled();
    expect(mockResume).not.toHaveBeenCalled();
    expect(holder.api!.visible).toBe(true);
    expect(holder.api!.activeMetric).toBe("weight");
    expect(holder.api!.phase).toBe("connectedStatus");
  });

  it("opening Body Fat then Lean Tissue switches active metric without sync", async () => {
    const holder = await mountSheet();
    await act(async () => {
      holder.api!.onPressCardConnection("bodyFat");
    });
    expect(holder.api!.activeMetric).toBe("bodyFat");
    await act(async () => {
      holder.api!.close();
    });
    await act(async () => {
      holder.api!.onPressCardConnection("leanTissue");
    });
    expect(holder.api!.activeMetric).toBe("leanTissue");
    expect(mockSyncLatest).not.toHaveBeenCalled();
  });
});
