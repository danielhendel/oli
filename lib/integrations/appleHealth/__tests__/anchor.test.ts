import AsyncStorage from "@react-native-async-storage/async-storage";
import { getWorkoutsAnchor, setWorkoutsAnchor, clearWorkoutsAnchor } from "../anchor";

jest.mock("@react-native-async-storage/async-storage", () => ({
  getItem: jest.fn(async () => null),
  setItem: jest.fn(async () => {
    return;
  }),
  removeItem: jest.fn(async () => {
    return;
  }),
}));

describe("appleHealth anchor storage", () => {
  const uid = "uid_test_1";
  it("uses deterministic per-user key", async () => {
    await setWorkoutsAnchor(uid, "anchor123");
    expect((AsyncStorage.setItem as unknown as jest.Mock).mock.calls[0]?.[0]).toBe(
      "appleHealth:anchor:v1:workouts:uid_test_1",
    );
  });

  it("get returns underlying storage value", async () => {
    (AsyncStorage.getItem as unknown as jest.Mock).mockResolvedValueOnce("a1");
    const v = await getWorkoutsAnchor(uid);
    expect(v).toBe("a1");
  });

  it("clear removes key", async () => {
    await clearWorkoutsAnchor(uid);
    expect((AsyncStorage.removeItem as unknown as jest.Mock).mock.calls[0]?.[0]).toBe(
      "appleHealth:anchor:v1:workouts:uid_test_1",
    );
  });
});
