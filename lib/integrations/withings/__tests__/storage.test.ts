/**
 * Unit tests: Withings storage — deterministic key and set/get roundtrip.
 */

import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  WITHINGS_LAST_CHECKED_AT,
  getWithingsLastCheckedAt,
  setWithingsLastCheckedAt,
} from "../storage";

jest.mock("@react-native-async-storage/async-storage", () => ({
  getItem: jest.fn(async () => null),
  setItem: jest.fn(async () => undefined),
  removeItem: jest.fn(async () => undefined),
}));

describe("withings storage", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("uses deterministic key WITHINGS_LAST_CHECKED_AT", async () => {
    await setWithingsLastCheckedAt("2025-03-01T12:00:00.000Z");
    expect((AsyncStorage.setItem as unknown as jest.Mock).mock.calls[0]?.[0]).toBe(
      "withings:lastCheckedAt",
    );
  });

  it("set/get roundtrip preserves value", async () => {
    const iso = "2025-03-01T14:30:00.000Z";
    (AsyncStorage.getItem as unknown as jest.Mock).mockResolvedValueOnce(iso);
    const got = await getWithingsLastCheckedAt();
    expect(got).toBe(iso);
    expect(AsyncStorage.getItem).toHaveBeenCalledWith(WITHINGS_LAST_CHECKED_AT);
  });

  it("get returns null when not set", async () => {
    (AsyncStorage.getItem as unknown as jest.Mock).mockResolvedValueOnce(null);
    const got = await getWithingsLastCheckedAt();
    expect(got).toBeNull();
  });

  it("set stores value at correct key", async () => {
    const iso = "2025-03-01T10:00:00.000Z";
    await setWithingsLastCheckedAt(iso);
    expect(AsyncStorage.setItem).toHaveBeenCalledWith(WITHINGS_LAST_CHECKED_AT, iso);
  });
});
