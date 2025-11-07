// apps/mobile/jest-setup.ts

// Polyfill fetch for Node/Jest
import 'cross-fetch/polyfill';
import type React from 'react';

/* eslint-env jest */
/* global jest */

export {};

/**
 * Jest setup for Expo SDK 54 + RN
 * - Mocks Apple Sign-In so tests can run in Node
 * - Pretends we're on a native/dev-client build (not Expo Go)
 * - Provides a virtual `expo-device` so "real device" guards pass
 * - Mocks centralized Firebase client to avoid real initialization
 * - Mocks expo-router (Stack/Slot/useRouter) for routing tests
 */

/* ---------------------------------- */
/* Firebase RN persistence (virtual)   */
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
      // Return EXACT shape tests expect, including a base64url-like rawNonce
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
/* Mock centralized Firebase client    */
/* - Prevent real env/initializeApp    */
/* - Make getFirebaseAuth() a jest.fn  */
/*   so tests can assert call counts   */
/* ---------------------------------- */
jest.mock('@/lib/firebaseClient', () => {
  const mockAuth = { __mockAuth__: true };
  return {
    __esModule: true,
    getFirebaseAuth: jest.fn(() => mockAuth),
    ensureAuthInitialized: jest.fn().mockResolvedValue(mockAuth),
    getFirestoreDb: jest.fn(() => ({})), // if something imports DB in tests
    __resetFirebaseClientForTests__: jest.fn(),
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
/* expo-router mock (Stack/Slot/router)*/
/* - Expose __mockReplace/__mockPush   */
/*   so tests can assert navigations    */
/* ---------------------------------- */
jest.mock('expo-router', () => {
  const React = require('react');
  const mockReplace = jest.fn();
  const mockPush = jest.fn();

  const Stack = ({ children }: { children?: React.ReactNode }) =>
    React.createElement(React.Fragment, null, children);

  const Slot = ({ children }: { children?: React.ReactNode }) =>
    React.createElement(React.Fragment, null, children);

  return {
    __esModule: true,
    Stack,
    Slot,
    useRouter: () => ({ replace: mockReplace, push: mockPush }),
    __mockReplace: mockReplace,
    __mockPush: mockPush,
  };
});

/* ---------------------------------- */
/* Providers used by RootLayout        */
/* - Pass-through wrappers supporting  */
/*   both default and named imports    */
/* ---------------------------------- */
jest.mock('@/theme', () => {
  const ThemeProvider = ({ children }: { children?: React.ReactNode }) => children ?? null;
  return {
    __esModule: true,
    default: ThemeProvider,
    ThemeProvider,
  };
});

jest.mock('@/providers/AuthProvider', () => {
  const React = require('react');
  const Ctx = React.createContext({ user: null, initializing: false });
  const useAuth = () => React.useContext(Ctx);
  const AuthProvider = ({ children }: { children?: React.ReactNode }) => children ?? null;
  return {
    __esModule: true,
    default: AuthProvider,
    AuthProvider,
    useAuth,
  };
});

/* ---------------------------------- */
/* Note: We intentionally DO NOT mock  */
/* '@/lib/auth/oauth/apple' here so    */
/* the real implementation is tested.  */
/* ---------------------------------- */
