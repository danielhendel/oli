import { describe, expect, it, jest, beforeEach } from "@jest/globals";

jest.mock("@react-native-async-storage/async-storage", () => ({
  getAllKeys: jest.fn().mockResolvedValue([]),
  multiRemove: jest.fn().mockResolvedValue(undefined),
  removeItem: jest.fn().mockResolvedValue(undefined),
}));

jest.mock("expo-file-system", () => ({
  cacheDirectory: "/cache/",
  documentDirectory: "/docs/",
  deleteAsync: jest.fn().mockResolvedValue(undefined),
}));

jest.mock("@/lib/nutrition/NutritionQueue", () => ({
  NutritionQueue: { clear: jest.fn().mockResolvedValue(undefined) },
}));

jest.mock("@/lib/data/workouts/workoutsCalendarMarkerCache", () => ({
  clearAllWorkoutCalendarMarkerCaches: jest.fn().mockResolvedValue(undefined),
}));

jest.mock("@/lib/data/body-scans/bodyScanOriginalCache", () => ({
  clearBodyScanOriginalCacheForAccount: jest.fn().mockResolvedValue({ ok: true, deletedCountBucket: "0" }),
  clearAllBodyScanOriginalCaches: jest.fn().mockResolvedValue({ ok: true, deletedCountBucket: "0" }),
  countBodyScanCacheInventory: jest.fn().mockResolvedValue({ remainingFiles: 0, partialFiles: 0 }),
}));

jest.mock("@/lib/data/body-scans/bodyScanCacheDevStatus", () => ({
  emitBodyScanCacheDevStatus: jest.fn(),
  countToDevBucket: (n: number) => (n === 0 ? "zero" : "one"),
  countToPartialBucket: (n: number) => (n === 0 ? "zero" : "one"),
  mapLegacyDeletedBucket: () => "zero",
}));

import AsyncStorage from "@react-native-async-storage/async-storage";
import { NutritionQueue } from "@/lib/nutrition/NutritionQueue";
import {
  clearAllBodyScanOriginalCaches,
  clearBodyScanOriginalCacheForAccount,
} from "@/lib/data/body-scans/bodyScanOriginalCache";
import { clearUserScopedLocalData } from "../accountLifecycleCleanup";

describe("clearUserScopedLocalData", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("clears global nutrition queue on sign out", async () => {
    await clearUserScopedLocalData({ previousUserId: "uid_a", reason: "sign_out" });
    expect(NutritionQueue.clear).toHaveBeenCalled();
  });

  it("removes per-uid keys on account switch", async () => {
    (AsyncStorage.getAllKeys as jest.Mock).mockResolvedValue([
      "onboarding:draft:v1:u:uid_a",
      "nutrition:recentLogging:v1:uid_a",
      "nutrition:recentLogging:v1:uid_b",
    ]);

    await clearUserScopedLocalData({ previousUserId: "uid_a", reason: "account_switch" });

    expect(AsyncStorage.multiRemove).toHaveBeenCalledWith(["onboarding:draft:v1:u:uid_a"]);
    expect(AsyncStorage.multiRemove).toHaveBeenCalledWith(["nutrition:recentLogging:v1:uid_a"]);
  });

  it("clears Body Scan original caches on sign out and account switch", async () => {
    await clearUserScopedLocalData({ previousUserId: "uid_a", reason: "sign_out" });
    expect(clearBodyScanOriginalCacheForAccount).toHaveBeenCalledWith("uid_a");
    expect(clearAllBodyScanOriginalCaches).toHaveBeenCalled();

    jest.clearAllMocks();
    await clearUserScopedLocalData({ previousUserId: "uid_a", reason: "account_switch" });
    expect(clearBodyScanOriginalCacheForAccount).toHaveBeenCalledWith("uid_a");
    expect(clearAllBodyScanOriginalCaches).toHaveBeenCalled();
  });

  it("clears Body Scan original caches on account deletion", async () => {
    await clearUserScopedLocalData({ previousUserId: "uid_a", reason: "account_deletion" });
    expect(clearBodyScanOriginalCacheForAccount).toHaveBeenCalledWith("uid_a");
    expect(clearAllBodyScanOriginalCaches).toHaveBeenCalled();
  });
});
