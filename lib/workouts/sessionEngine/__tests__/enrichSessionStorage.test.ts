import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  clearEnrichSessionPointer,
  getEnrichSessionPointer,
  setEnrichSessionPointer,
} from "../enrichSessionStorage";

jest.mock("@react-native-async-storage/async-storage", () => ({
  getItem: jest.fn(async () => null),
  setItem: jest.fn(async () => undefined),
  removeItem: jest.fn(async () => undefined),
}));

describe("enrichSessionStorage", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("get returns null for empty target id", async () => {
    const got = await getEnrichSessionPointer("u1", "  ");
    expect(got).toBeNull();
    expect(AsyncStorage.getItem).not.toHaveBeenCalled();
  });

  it("set and get use a deterministic per-target key", async () => {
    (AsyncStorage.getItem as unknown as jest.Mock).mockResolvedValueOnce("s99");
    const got = await getEnrichSessionPointer("u1", "2026-03-18:session:0:w1");
    expect(got).toBe("s99");
    expect(AsyncStorage.getItem).toHaveBeenCalledWith(
      "workouts:enrichSession:v1:u1:2026-03-18%3Asession%3A0%3Aw1",
    );
  });

  it("set writes encoded key", async () => {
    await setEnrichSessionPointer("u1", "tid:a", "s1");
    expect(AsyncStorage.setItem).toHaveBeenCalledWith(
      "workouts:enrichSession:v1:u1:tid%3Aa",
      "s1",
    );
  });

  it("clear removes encoded key", async () => {
    await clearEnrichSessionPointer("u1", "tid:a");
    expect(AsyncStorage.removeItem).toHaveBeenCalledWith("workouts:enrichSession:v1:u1:tid%3Aa");
  });
});
