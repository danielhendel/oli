/**
 * Per-uid Apple Health workouts recent-repair throttle storage helpers.
 *
 * Asserts:
 * - Deterministic key shape (mirrors the documented `appleHealth:workoutsRecentRepair:lastRunAt:{uid}`).
 * - get/set roundtrip per uid.
 * - Two uids do not collide (no shared global slot).
 * - Empty uid throws (prevents a missing-auth race from writing to a shared key).
 */

import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  APPLE_HEALTH_WORKOUTS_RECENT_REPAIR_LAST_RUN_AT_PREFIX,
  appleHealthWorkoutsRecentRepairLastRunAtKey,
  getAppleHealthWorkoutsRecentRepairLastRunAt,
  setAppleHealthWorkoutsRecentRepairLastRunAt,
} from "../storage";

jest.mock("@react-native-async-storage/async-storage", () => ({
  getItem: jest.fn(async () => null),
  setItem: jest.fn(async () => undefined),
  removeItem: jest.fn(async () => undefined),
}));

describe("appleHealth workouts recent repair throttle storage", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("builds a deterministic per-uid key under the documented prefix", () => {
    expect(APPLE_HEALTH_WORKOUTS_RECENT_REPAIR_LAST_RUN_AT_PREFIX).toBe(
      "appleHealth:workoutsRecentRepair:lastRunAt",
    );
    expect(appleHealthWorkoutsRecentRepairLastRunAtKey("uidA")).toBe(
      "appleHealth:workoutsRecentRepair:lastRunAt:uidA",
    );
  });

  it("set/get roundtrip uses the per-uid key", async () => {
    const iso = "2026-06-02T10:00:00.000Z";
    await setAppleHealthWorkoutsRecentRepairLastRunAt("uidA", iso);
    expect(AsyncStorage.setItem).toHaveBeenCalledWith(
      "appleHealth:workoutsRecentRepair:lastRunAt:uidA",
      iso,
    );
    (AsyncStorage.getItem as unknown as jest.Mock).mockResolvedValueOnce(iso);
    const got = await getAppleHealthWorkoutsRecentRepairLastRunAt("uidA");
    expect(AsyncStorage.getItem).toHaveBeenLastCalledWith(
      "appleHealth:workoutsRecentRepair:lastRunAt:uidA",
    );
    expect(got).toBe(iso);
  });

  it("uids do not collide", async () => {
    await setAppleHealthWorkoutsRecentRepairLastRunAt("uidA", "2026-06-02T10:00:00.000Z");
    await setAppleHealthWorkoutsRecentRepairLastRunAt("uidB", "2026-06-02T11:00:00.000Z");
    const calls = (AsyncStorage.setItem as unknown as jest.Mock).mock.calls;
    expect(calls).toHaveLength(2);
    expect(calls[0][0]).toBe("appleHealth:workoutsRecentRepair:lastRunAt:uidA");
    expect(calls[0][1]).toBe("2026-06-02T10:00:00.000Z");
    expect(calls[1][0]).toBe("appleHealth:workoutsRecentRepair:lastRunAt:uidB");
    expect(calls[1][1]).toBe("2026-06-02T11:00:00.000Z");
  });

  it("get returns null when never written", async () => {
    (AsyncStorage.getItem as unknown as jest.Mock).mockResolvedValueOnce(null);
    const got = await getAppleHealthWorkoutsRecentRepairLastRunAt("uidA");
    expect(got).toBeNull();
  });

  it("rejects an empty uid (prevents shared global slot)", () => {
    expect(() => appleHealthWorkoutsRecentRepairLastRunAtKey("")).toThrow(/uid required/);
  });
});
