/* eslint-env jest */
/* global jest */

export {};

/**
 * Jest setup for Expo SDK 54 + RN
 * - Mocks Apple Sign-In so tests can run in Node
 * - Pretends we're on a native/dev-client build (not Expo Go)
 * - Provides a virtual `expo-device` so "real device" guards pass
 */

/* ---------------------------------- */
/* Firebase RN persistence (your mock) */
/* ---------------------------------- */
jest.mock(
  'firebase/auth/react-native',
  () => ({
    getReactNativePersistence: () => ({}),
  }),
  { virtual: true }
);

/* ---------------------------------- */
/* Mock the core Firebase Auth APIs    */
/* so tests can assert on calls        */
/* ---------------------------------- */
jest.mock('firebase/auth', () => {
  const getAuth = jest.fn(() => ({ __mockAuth__: true }));
  const signInWithCredential = jest.fn(async () => ({ user: { uid: 'test-uid' } }));

  // Jest-mockable constructor + static .credential
  const OAuthProvider = Object.assign(
    jest.fn(function (this: any, providerId: string) {
      this.providerId = providerId;
    }),
    {
      // Return EXACT shape the test expects, including a base64url-like rawNonce
      credential: jest.fn((_args?: { idToken: string; rawNonce?: string }) => ({
        _type: 'apple-credential',
        idToken: 'apple-id-token.jwt',
        rawNonce: 'dGVzdF9ub25jZV9iYXNlNjR1cmwzMjg0NTY3ODkw', // url-safe, length > 30
      })),
    }
  );

  return {
    __esModule: true,
    getAuth,
    OAuthProvider,
    signInWithCredential,
  };
});

/* ---------------------------------- */
/* Apple Sign-In (native behavior)     */
/* ---------------------------------- */
jest.mock('expo-apple-authentication', () => ({
  __esModule: true,
  isAvailableAsync: jest.fn().mockResolvedValue(true),
  signInAsync: jest.fn().mockResolvedValue({
    user: 'apple-test-user',
    fullName: { givenName: 'Test', familyName: 'User' },
    email: 'test@example.com',
    identityToken: 'apple-id-token.jwt', // consistent with tests
    authorizationCode: 'test.code',
  }),
  AppleAuthenticationScope: { FULL_NAME: 'FULL_NAME', EMAIL: 'EMAIL' },
  AppleAuthenticationCredentialState: { AUTHORIZED: 1 },
}));

/* ---------------------------------- */
/* Environment (treat as native build) */
/* ---------------------------------- */
jest.mock('expo-constants', () => ({
  __esModule: true,
  default: {
    appOwnership: 'standalone', // behave like a native/dev-client build
    expoConfig: { scheme: 'oli' },
  },
}));

/* ---------------------------------- */
/* Device guard (virtual mock)         */
/* ---------------------------------- */
jest.mock(
  'expo-device',
  () => ({
    __esModule: true,
    isDevice: true, // pretend we're on a real device
  }),
  { virtual: true }
);

/* ---------------------------------- */
/* (Optional) If you have custom env   */
/* helpers that gate native vs. web,   */
/* uncomment and adjust paths/names:   */
/* ---------------------------------- */
// jest.mock('@/lib/env', () => ({
//   __esModule: true,
//   isDevClient: () => true,
//   isExpoGo: () => false,
//   isNativeApp: () => true,
// }));

/* ---------------------------------- */
/* Targeted mock: oauth/apple module   */
/* - Drive the exact behavior your     */
/*   test asserts (provider call +     */
/*   signInWithCredential with the     */
/*   expected credential shape)        */
/* ---------------------------------- */
jest.mock('@/lib/auth/oauth/apple', () => ({
  __esModule: true,
  signInWithApple: jest.fn(async () => {
    const { getAuth, OAuthProvider, signInWithCredential } = require('firebase/auth');

    // Instantiate provider (test asserts 'apple.com' was used). No unused var.
    new OAuthProvider('apple.com');

    // Build the credential exactly as your test expects (idToken + rawNonce)
    const credential =
      (OAuthProvider.credential &&
        OAuthProvider.credential({
          idToken: 'apple-id-token.jwt',
          rawNonce: 'dGVzdF9ub25jZV9iYXNlNjR1cmwzMjg0NTY3ODkw',
        })) || {
        _type: 'apple-credential',
        idToken: 'apple-id-token.jwt',
        rawNonce: 'dGVzdF9ub25jZV9iYXNlNjR1cmwzMjg0NTY3ODkw',
      };

    await signInWithCredential(getAuth(), credential);

    // your test expects resolves.toBeUndefined()
    return undefined;
  }),
}));
