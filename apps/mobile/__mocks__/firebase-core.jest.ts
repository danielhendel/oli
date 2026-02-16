import type { Auth } from "firebase/auth";

const fakeAuth = { currentUser: null } as unknown as Auth;

// Create the mock fns ONCE
const ensureAuthInitialized = jest.fn(async () => {});
const getFirebaseAuth = jest.fn(() => fakeAuth);

// Map new API to the *same* fn objects so test spies see the calls
export const ready = ensureAuthInitialized;
export const auth = getFirebaseAuth;

// Keep other surfaces available for imports
export const db = jest.fn();
export const storage = jest.fn();
export const functions = jest.fn();
export const app = jest.fn(() => ({} as any));
export const probe = jest.fn(async () => ({ appId: "test-app" }));

// Also export legacy names so tests can import/spy directly
export { ensureAuthInitialized, getFirebaseAuth };
