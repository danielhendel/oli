// apps/mobile/jest-setup.ts
/* eslint-env jest */
/* global jest */

export {};

/**
 * Jest setup for Expo SDK 54 + RN
 * - Polyfills global fetch for Firebase rules tests
 * - Mocks Apple Sign-In so tests can run in Node
 * - Pretends we're on a native/dev-client build (not Expo Go)
 * - Provides a virtual `expo-device` so "real device" guards pass
 *
 * Note: The mock for "@/lib/firebase/core" now lives in `jest-setup.pre.ts`
 * (configured via `setupFiles`) so it's applied before modules are evaluated.
 */

/* ---------------------------------- */
/* Global fetch polyfill (Node/JSDOM) */
/* ---------------------------------- */
import "cross-fetch/polyfill";

/* ---------------------------------- */
/* Firebase RN persistence (your mock)*/
/* ---------------------------------- */
jest.mock(
  "firebase/auth/react-native",
  () => ({
    getReactNativePersistence: () => ({}),
  }),
  { virtual: true }
);

/* ---------------------------------- */
/* Mock the core Firebase Auth APIs   */
/* so tests can assert on calls       */
/* ---------------------------------- */
jest.mock("firebase/auth", () => {
  const getAuth = jest.fn(() => ({ __mockAuth__: true }));
  const signInWithCredential = jest.fn(async () => ({ user: { uid: "test-uid" } }));

  const OAuthProvider = Object.assign(
    jest.fn(function (this: any, providerId: string) {
      this.providerId = providerId;
    }),
    {
      credential: jest.fn((_args?: { idToken: string; rawNonce?: string }) => ({
        _type: "apple-credential",
        idToken: "apple-id-token.jwt",
        rawNonce: "dGVzdF9ub25jZV9iYXNlNjR1cmwzMjg0NTY3ODkw",
      })),
    }
  );

  return {
    __esModule: true,
    getAuth,
    OAuthProvider,
    signInWithCredential,
    createUserWithEmailAndPassword: jest.fn(async () => ({ user: { uid: "test-uid" } })),
    signInWithEmailAndPassword: jest.fn(async () => ({ user: { uid: "test-uid" } })),
    signOut: jest.fn(async () => undefined),
  };
});

/* ---------------------------------- */
/* Apple Sign-In (native behavior)    */
/* ---------------------------------- */
jest.mock("expo-apple-authentication", () => ({
  __esModule: true,
  isAvailableAsync: jest.fn().mockResolvedValue(true),
  signInAsync: jest.fn().mockResolvedValue({
    user: "apple-test-user",
    fullName: { givenName: "Test", familyName: "User" },
    email: "test@example.com",
    identityToken: "apple-id-token.jwt",
    authorizationCode: "test.code",
  }),
  AppleAuthenticationScope: { FULL_NAME: "FULL_NAME", EMAIL: "EMAIL" },
  AppleAuthenticationCredentialState: { AUTHORIZED: 1 },
}));

/* ---------------------------------- */
/* Environment (treat as native build)*/
/* ---------------------------------- */
jest.mock("expo-constants", () => ({
  __esModule: true,
  default: {
    appOwnership: "standalone",
    expoConfig: { scheme: "oli" },
  },
}));

/* ---------------------------------- */
/* Device guard (virtual mock)        */
/* ---------------------------------- */
jest.mock(
  "expo-device",
  () => ({
    __esModule: true,
    isDevice: true,
  }),
  { virtual: true }
);

/* ---------------------------------- */
/* Optional: silence unmocked Expo noise */
// jest.mock('expo-modules-core', () => ({}), { virtual: true });

/* ---------------------------------- */
/* Targeted mock: oauth/apple module  */
/* ---------------------------------- */
jest.mock("@/lib/auth/oauth/apple", () => ({
  __esModule: true,
  signInWithApple: jest.fn(async () => {
    const { getAuth, OAuthProvider, signInWithCredential } = require("firebase/auth");

    new OAuthProvider("apple.com");

    const credential =
      (OAuthProvider.credential &&
        OAuthProvider.credential({
          idToken: "apple-id-token.jwt",
          rawNonce: "dGVzdF9ub25jZV9iYXNlNjR1cmwzMjg0NTY3ODkw",
        })) || {
        _type: "apple-credential",
        idToken: "apple-id-token.jwt",
        rawNonce: "dGVzdF9ub25jZV9iYXNlNjR1cmwzMjg0NTY3ODkw",
      };

    await signInWithCredential(getAuth(), credential);
    return undefined;
  }),
}));
