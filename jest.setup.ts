import { jest } from "@jest/globals";

/**
 * Global Jest setup + mocks
 * - Mocks RNFirebase native modules so tests don't try to load iOS/Android code
 * - Provides a minimal Firestore API for ensureUserProvisioned()
 */

// --- RNFirebase app mock ---
jest.mock("@react-native-firebase/app", () => {
  return {
    __esModule: true,
    default: () => ({}),
  };
});

// --- Firestore mock (no native) ---
jest.mock("@react-native-firebase/firestore", () => {
  // The subset of methods our code calls
  type DocRefMock = {
    get: () => Promise<{ exists: boolean }>;
    set: (data?: unknown) => Promise<void>;
  };

  // `doc()` returns an object with async get/set
  const doc = jest.fn((): DocRefMock => ({
    get: async () => ({ exists: false }),
    set: async () => { /* no-op */ },
  }));

  // Module callable: firestore() -> { doc }
  function firestore() {
    return { doc };
  }

  // Attach FieldValue.serverTimestamp without using `any`
  (firestore as unknown as {
    FieldValue: { serverTimestamp: () => Date }
  }).FieldValue = {
    serverTimestamp: () => new Date(),
  };

  return firestore;
});
