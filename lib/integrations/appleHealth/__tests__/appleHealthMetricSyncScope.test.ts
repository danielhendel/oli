import { describe, it, expect, jest, beforeEach } from "@jest/globals";

const mockGetItem = jest.fn();
const mockSetItem = jest.fn();

jest.mock("@react-native-async-storage/async-storage", () => ({
  getItem: (...a: unknown[]) => mockGetItem(...a),
  setItem: (...a: unknown[]) => mockSetItem(...a),
}));

import {
  appleHealthMetricSyncScopesKey,
  getAppleHealthMetricSyncScopes,
  isAppleHealthMetricSyncEnabled,
  setAppleHealthMetricSyncScopes,
} from "@/lib/integrations/appleHealth/storage";
import {
  enableAllMetricsForDomain,
  setAppleHealthMetricSyncEnabled,
} from "@/lib/integrations/appleHealth/appleHealthMetricSyncController";

describe("Apple Health metric sync scope", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGetItem.mockResolvedValue(null);
    mockSetItem.mockResolvedValue(undefined);
  });

  it("keys scopes by uid", () => {
    expect(appleHealthMetricSyncScopesKey("u1")).toBe("appleHealth:metricSyncScopes:u1");
    expect(() => appleHealthMetricSyncScopesKey("")).toThrow(/uid required/);
  });

  it("defaults ON when domain enabled and no metric scopes", async () => {
    mockGetItem.mockImplementation(async (key: string) => {
      if (key === "appleHealth:connected") return "true";
      if (key === "appleHealth:domainScopes") {
        return JSON.stringify({ version: 1, body: true });
      }
      return null;
    });
    await expect(isAppleHealthMetricSyncEnabled("u1", "weight", "body")).resolves.toBe(true);
  });

  it("honors explicit OFF", async () => {
    mockGetItem.mockImplementation(async (key: string) => {
      if (key === "appleHealth:connected") return "true";
      if (key === "appleHealth:domainScopes") {
        return JSON.stringify({ version: 1, body: true });
      }
      if (key === appleHealthMetricSyncScopesKey("u1")) {
        return JSON.stringify({ version: 1, metrics: { weight: false, bodyFat: true } });
      }
      return null;
    });
    await expect(isAppleHealthMetricSyncEnabled("u1", "weight", "body")).resolves.toBe(false);
    await expect(isAppleHealthMetricSyncEnabled("u1", "bodyFat", "body")).resolves.toBe(true);
  });

  it("setAppleHealthMetricSyncEnabled persists and does not leak across uids", async () => {
    const store = new Map<string, string>();
    store.set("appleHealth:connected", "true");
    store.set("appleHealth:domainScopes", JSON.stringify({ version: 1, body: true }));
    mockGetItem.mockImplementation(async (key: string) => store.get(key) ?? null);
    mockSetItem.mockImplementation(async (key: string, value: string) => {
      store.set(key, value);
    });

    await setAppleHealthMetricSyncEnabled({ uid: "u1", metricId: "weight", enabled: false });
    const u1 = await getAppleHealthMetricSyncScopes("u1");
    expect(u1?.metrics.weight).toBe(false);
    expect(await getAppleHealthMetricSyncScopes("u2")).toBeNull();
  });

  it("enableAllMetricsForDomain turns body metrics on", async () => {
    const store = new Map<string, string>();
    mockGetItem.mockImplementation(async (key: string) => store.get(key) ?? null);
    mockSetItem.mockImplementation(async (key: string, value: string) => {
      store.set(key, value);
    });
    await enableAllMetricsForDomain("u1", "body");
    const scopes = await getAppleHealthMetricSyncScopes("u1");
    expect(scopes?.metrics.weight).toBe(true);
    expect(scopes?.metrics.bodyFat).toBe(true);
    expect(scopes?.metrics.leanTissue).toBe(true);
  });

  it("setAppleHealthMetricSyncScopes round-trips", async () => {
    mockGetItem.mockResolvedValue(null);
    await setAppleHealthMetricSyncScopes("u1", {
      version: 1,
      metrics: { steps: false },
    });
    expect(mockSetItem).toHaveBeenCalledWith(
      appleHealthMetricSyncScopesKey("u1"),
      JSON.stringify({ version: 1, metrics: { steps: false } }),
    );
  });
});
