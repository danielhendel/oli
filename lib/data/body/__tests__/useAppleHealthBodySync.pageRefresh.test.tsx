import { describe, it, expect, jest, beforeEach } from "@jest/globals";
import React from "react";
import renderer, { act } from "react-test-renderer";

const mockSyncLatest = jest.fn(async () => ({ ok: true as const, ingested: 1 }));
const mockIsDomainEnabled = jest.fn(async () => true);
const mockGetLastChecked = jest.fn(async () => null);
const mockGetIdToken = jest.fn(async () => "tok");
const mockNetState = { isConnected: true as boolean | false };

const mockFocusCallbacks: (() => void | (() => void))[] = [];


jest.mock("@react-navigation/native", () => {
  const ReactLocal = require("react") as typeof import("react");
  return {
    useFocusEffect: (cb: () => void | (() => void)) => {
      ReactLocal.useEffect(() => {
        mockFocusCallbacks.push(cb);
        const cleanup = cb();
        return typeof cleanup === "function" ? cleanup : undefined;
      }, [cb]);
    },
  };
});

jest.mock("@react-native-community/netinfo", () => ({
  useNetInfo: () => ({
    isConnected: mockNetState.isConnected,
    isInternetReachable: mockNetState.isConnected,
  }),
}));

jest.mock("@/lib/auth/AuthProvider", () => ({
  useAuth: () => ({
    user: { uid: "u1" },
    getIdToken: mockGetIdToken,
  }),
}));

jest.mock("@/lib/data/body/connectAppleHealthBodyForComposition", () => ({
  syncAppleHealthBodyLatestForComposition: (...a: unknown[]) => mockSyncLatest(...a),
}));

jest.mock("@/lib/integrations/appleHealth/storage", () => ({
  getAppleHealthBodyLastCheckedAt: (...a: unknown[]) => mockGetLastChecked(...a),
  isAppleHealthDomainEnabled: (...a: unknown[]) => mockIsDomainEnabled(...a),
}));

jest.mock("@/lib/sync/throttle", () => ({
  shouldRun: () => true,
}));

import { useAppleHealthBodySync } from "../useAppleHealthBodySync";

function Host({ onReady }: { onReady: (api: ReturnType<typeof useAppleHealthBodySync>) => void }) {
  const onSynced = React.useRef(jest.fn()).current;
  const api = useAppleHealthBodySync(onSynced);
  React.useEffect(() => {
    onReady(api);
  }, [api, onReady]);
  return null;
}

async function mountApi() {
  const holder: { api: ReturnType<typeof useAppleHealthBodySync> | null } = { api: null };
  await act(async () => {
    renderer.create(
      React.createElement(Host, {
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
  if (!holder.api) throw new Error("api not ready");
  return holder;
}

describe("useAppleHealthBodySync page ownership", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockFocusCallbacks.length = 0;
    mockNetState.isConnected = true;
    mockSyncLatest.mockResolvedValue({ ok: true, ingested: 1 });
    mockIsDomainEnabled.mockResolvedValue(true);
    mockGetLastChecked.mockResolvedValue(null);
  });

  it("focus entry invokes one latest Body refresh with body_page_entry", async () => {
    const holder = await mountApi();
    expect(mockIsDomainEnabled).toHaveBeenCalledWith("body");
    expect(mockSyncLatest).toHaveBeenCalledTimes(1);
    expect(mockSyncLatest.mock.calls[0]?.[1]).toEqual({ trigger: "body_page_entry" });
    expect(holder.api).not.toBeNull();
  });

  it("does not refresh when Body domain disabled", async () => {
    mockIsDomainEnabled.mockResolvedValue(false);
    await act(async () => {
      renderer.create(
        React.createElement(Host, {
          onReady: () => undefined,
        }),
      );
    });
    await act(async () => {
      await Promise.resolve();
    });
    expect(mockSyncLatest).not.toHaveBeenCalled();
  });

  it("pull-to-refresh uses body_page_pull_refresh and coalesces", async () => {
    let resolveSync!: (v: { ok: true; ingested: number }) => void;
    mockSyncLatest.mockImplementation(
      () =>
        new Promise((resolve) => {
          resolveSync = resolve;
        }),
    );

    const holder = await mountApi();
    await act(async () => {
      resolveSync({ ok: true, ingested: 1 });
      await Promise.resolve();
    });
    mockSyncLatest.mockClear();

    mockSyncLatest.mockImplementation(
      () =>
        new Promise((resolve) => {
          resolveSync = resolve;
        }),
    );

    let pull1!: Promise<void>;
    let pull2!: Promise<void>;
    await act(async () => {
      pull1 = holder.api!.onPullToRefresh();
      pull2 = holder.api!.onPullToRefresh();
    });
    expect(holder.api!.isPullRefreshing).toBe(true);
    expect(mockSyncLatest).toHaveBeenCalledTimes(1);
    expect(mockSyncLatest.mock.calls[0]?.[1]).toEqual({ trigger: "body_page_pull_refresh" });

    await act(async () => {
      resolveSync({ ok: true, ingested: 1 });
      await pull1;
      await pull2;
    });
    expect(holder.api!.isPullRefreshing).toBe(false);
    expect(holder.api!.pullRefreshError).toBeNull();
  });

  it("offline pull maps to friendly copy and stops spinner", async () => {
    mockSyncLatest.mockClear();

    mockNetState.isConnected = false;
    // Fresh host so useNetInfo reads offline.
    const offlineHolder: { api: ReturnType<typeof useAppleHealthBodySync> | null } = {
      api: null,
    };
    await act(async () => {
      renderer.create(
        React.createElement(Host, {
          onReady: (next) => {
            offlineHolder.api = next;
          },
        }),
      );
    });
    await act(async () => {
      await Promise.resolve();
      await Promise.resolve();
    });
    // Entry refresh should no-op while offline (no sync).
    expect(mockSyncLatest).not.toHaveBeenCalled();

    await act(async () => {
      await offlineHolder.api!.onPullToRefresh();
    });
    expect(mockSyncLatest).not.toHaveBeenCalled();
    expect(offlineHolder.api!.isPullRefreshing).toBe(false);
    expect(offlineHolder.api!.pullRefreshError).toMatch(/Check your connection/i);
  });
});
