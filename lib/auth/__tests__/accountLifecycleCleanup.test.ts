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

import AsyncStorage from "@react-native-async-storage/async-storage";
import { NutritionQueue } from "@/lib/nutrition/NutritionQueue";
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
      "nutrition:recentLogging:v1:uid_a",
      "nutrition:recentLogging:v1:uid_b",
    ]);

    await clearUserScopedLocalData({ previousUserId: "uid_a", reason: "account_switch" });

    expect(AsyncStorage.multiRemove).toHaveBeenCalledWith(
      expect.arrayContaining(["nutrition:recentLogging:v1:uid_a"]),
    );
  });
});
