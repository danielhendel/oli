import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  getLastRestTimerDurationSec,
  setLastRestTimerDurationSec,
} from "../restTimerStorage";

jest.mock("@react-native-async-storage/async-storage", () => ({
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
}));

describe("restTimerStorage", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("getLastRestTimerDurationSec returns null when not set", async () => {
    (AsyncStorage.getItem as jest.Mock).mockResolvedValue(null);
    expect(await getLastRestTimerDurationSec()).toBeNull();
  });

  it("getLastRestTimerDurationSec returns parsed positive integer", async () => {
    (AsyncStorage.getItem as jest.Mock).mockResolvedValue("60");
    expect(await getLastRestTimerDurationSec()).toBe(60);
  });

  it("getLastRestTimerDurationSec returns null for invalid value", async () => {
    (AsyncStorage.getItem as jest.Mock).mockResolvedValue("not-a-number");
    expect(await getLastRestTimerDurationSec()).toBeNull();
  });

  it("getLastRestTimerDurationSec returns null for zero", async () => {
    (AsyncStorage.getItem as jest.Mock).mockResolvedValue("0");
    expect(await getLastRestTimerDurationSec()).toBeNull();
  });

  it("setLastRestTimerDurationSec writes rounded seconds", async () => {
    await setLastRestTimerDurationSec(45.7);
    expect(AsyncStorage.setItem).toHaveBeenCalledWith(
      "workouts:restTimer:lastDurationSec:v1",
      "46",
    );
  });

  it("setLastRestTimerDurationSec does not write for non-positive", async () => {
    await setLastRestTimerDurationSec(0);
    expect(AsyncStorage.setItem).not.toHaveBeenCalled();
    await setLastRestTimerDurationSec(-1);
    expect(AsyncStorage.setItem).not.toHaveBeenCalled();
  });
});
