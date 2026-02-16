// Mocks for Firestore used by lib/db/writeEvents.ts
jest.mock("firebase/firestore", () => ({
    addDoc: jest.fn(async () => ({ id: "new123" })),
    serverTimestamp: jest.fn(() => "TS"),
  }));
  
  jest.mock("../../lib/db/paths", () => ({
    eventsCol: () => ({}),
  }));
  
  import { saveWorkoutLog } from "../../lib/db/writeEvents";
  
  test("saveWorkoutLog returns new id", async () => {
    const id = await saveWorkoutLog("uid1", { durationMs: 600000 });
    expect(id).toBe("new123");
  });
  