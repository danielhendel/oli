jest.mock("@/lib/auth/AuthProvider", () => ({
  useAuth: () => ({ user: null, initializing: false, getIdToken: async () => null }),
}));
jest.mock("@/lib/integrations/appleHealth/anchor", () => ({
  getWorkoutsAnchor: async () => null,
  setWorkoutsAnchor: async () => {
    return;
  },
}));
jest.mock("@/lib/integrations/appleHealth/storage", () => ({
  getLastSyncAt: async () => null,
  setLastSyncAt: async () => { return; },
  getAppleHealthConnected: async () => false,
  setAppleHealthConnected: async () => { return; },
  getAppleHealthNotAvailable: async () => false,
  setAppleHealthNotAvailable: async () => { return; },
}));
jest.mock("@/lib/integrations/appleHealth", () => ({
  requestPermissions: async () => ({ ok: false, error: "" }),
  pullTodaySnapshot: async () => ({ ok: true, data: { steps: 0, workouts: [] } }),
  pullAnchoredWorkouts: async () => ({ ok: true, data: { workouts: [], anchor: "mock" } }),
  stepsIdempotencyKey: () => "",
  workoutIdempotencyKey: () => "",
}));
jest.mock("@/lib/api/ingest", () => ({
  ingestRawEvent: async () => ({ ok: true }),
}));
jest.mock("expo-router", () => ({
  useNavigation: () => ({ setOptions: jest.fn() }),
}));

import WorkoutsIndex from "../index";
import WorkoutsOverview from "../overview";

describe("workouts landing route", () => {
  it("/workouts aliases overview module", () => {
    expect(WorkoutsIndex).toBe(WorkoutsOverview);
  });
});
