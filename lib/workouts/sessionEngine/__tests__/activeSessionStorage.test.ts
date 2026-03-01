import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  clearActiveWorkoutSessionId,
  getActiveWorkoutSessionId,
  setActiveWorkoutSessionId,
} from "../activeSessionStorage";

jest.mock("@react-native-async-storage/async-storage", () => ({
  getItem: jest.fn(async () => null),
  setItem: jest.fn(async () => undefined),
  removeItem: jest.fn(async () => undefined),
}));

describe("activeSessionStorage", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("get uses deterministic key and returns value", async () => {
    (AsyncStorage.getItem as unknown as jest.Mock).mockResolvedValueOnce("s1");
    const got = await getActiveWorkoutSessionId("u1");
    expect(got).toBe("s1");
    expect(AsyncStorage.getItem).toHaveBeenCalledWith("workouts:activeSessionId:v1:u1");
  });

  it("set stores value at deterministic key", async () => {
    await setActiveWorkoutSessionId("u1", "s1");
    expect(AsyncStorage.setItem).toHaveBeenCalledWith("workouts:activeSessionId:v1:u1", "s1");
  });

  it("clear removes key", async () => {
    await clearActiveWorkoutSessionId("u1");
    expect(AsyncStorage.removeItem).toHaveBeenCalledWith("workouts:activeSessionId:v1:u1");
  });
});
