import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  clearActiveWorkoutSessionId,
  getActiveWorkoutLogFlowMode,
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

  it("set stores session id and clears flow mode when live", async () => {
    await setActiveWorkoutSessionId("u1", "s1");
    expect(AsyncStorage.setItem).toHaveBeenCalledWith("workouts:activeSessionId:v1:u1", "s1");
    expect(AsyncStorage.removeItem).toHaveBeenCalledWith("workouts:activeLogFlowMode:v1:u1");
  });

  it("set stores backfill flow mode when requested", async () => {
    await setActiveWorkoutSessionId("u1", "s1", { logFlowMode: "backfill" });
    expect(AsyncStorage.setItem).toHaveBeenCalledWith("workouts:activeSessionId:v1:u1", "s1");
    expect(AsyncStorage.setItem).toHaveBeenCalledWith("workouts:activeLogFlowMode:v1:u1", "backfill");
  });

  it("set stores enrich target id for backfill when provided", async () => {
    await setActiveWorkoutSessionId("u1", "s1", {
      logFlowMode: "backfill",
      enrichTargetId: "2026-03-18:session:0:w1",
    });
    expect(AsyncStorage.setItem).toHaveBeenCalledWith(
      "workouts:activeEnrichTargetId:v1:u1",
      "2026-03-18:session:0:w1",
    );
  });

  it("getActiveWorkoutLogFlowMode returns backfill when stored", async () => {
    (AsyncStorage.getItem as unknown as jest.Mock).mockResolvedValueOnce("backfill");
    const got = await getActiveWorkoutLogFlowMode("u1");
    expect(got).toBe("backfill");
    expect(AsyncStorage.getItem).toHaveBeenCalledWith("workouts:activeLogFlowMode:v1:u1");
  });

  it("clear removes session, flow, and enrich target keys", async () => {
    await clearActiveWorkoutSessionId("u1");
    expect(AsyncStorage.removeItem).toHaveBeenCalledWith("workouts:activeSessionId:v1:u1");
    expect(AsyncStorage.removeItem).toHaveBeenCalledWith("workouts:activeLogFlowMode:v1:u1");
    expect(AsyncStorage.removeItem).toHaveBeenCalledWith("workouts:activeEnrichTargetId:v1:u1");
  });
});
