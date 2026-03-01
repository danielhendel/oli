import AsyncStorage from "@react-native-async-storage/async-storage";
import { addWorkoutJournalSessionId, listWorkoutJournalSessionIds } from "../sessionIndex";

jest.mock("@react-native-async-storage/async-storage", () => ({
  getItem: jest.fn(async () => null),
  setItem: jest.fn(async () => undefined),
  removeItem: jest.fn(async () => undefined),
}));

describe("sessionIndex", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("list returns [] on missing key (fail-closed)", async () => {
    const got = await listWorkoutJournalSessionIds("u1");
    expect(got).toEqual([]);
  });

  it("list returns [] on corrupted JSON (fail-closed)", async () => {
    (AsyncStorage.getItem as unknown as jest.Mock).mockResolvedValueOnce("not-json");
    const got = await listWorkoutJournalSessionIds("u1");
    expect(got).toEqual([]);
  });

  it("add appends sessionId once (idempotent)", async () => {
    (AsyncStorage.getItem as unknown as jest.Mock).mockResolvedValueOnce(JSON.stringify(["s1"]));
    await addWorkoutJournalSessionId("u1", "s2");
    expect(AsyncStorage.setItem).toHaveBeenCalledWith(
      "workouts:journalIndex:v1:u:u1",
      JSON.stringify(["s1", "s2"]),
    );

    (AsyncStorage.getItem as unknown as jest.Mock).mockResolvedValueOnce(JSON.stringify(["s1", "s2"]));
    await addWorkoutJournalSessionId("u1", "s2");
    expect((AsyncStorage.setItem as unknown as jest.Mock).mock.calls.length).toBe(1);
  });
});
