// apps/mobile/jest-setup.ts

// Polyfill fetch for Node/Jest
import 'cross-fetch/polyfill';

/* eslint-env jest */
/* global jest */

export {};

/**
 * Jest setup for Expo SDK 54 + RN
 * - Ensures __DEV__ exists
 * - Mocks Apple Sign-In so tests can run in Node
 * - Pretends we're on a native/dev-client build (not Expo Go)
 * - Provides a virtual `expo-device` so "real device" guards pass
 * - Mocks centralized Firebase client to avoid real initialization
 * - Mocks expo-router (Stack/Slot/useRouter/usePathname/Redirect)
 * - Mocks react-native-safe-area-context + react-native-gesture-handler
 */

/* ---------------------------------- */
/* React Native global __DEV__ flag    */
/* ---------------------------------- */
(global as unknown as { __DEV__: boolean }).__DEV__ = true;

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
/* Mock Firebase Auth APIs             */
/* ---------------------------------- */
jest.mock('firebase/auth', () => {
  const getAuth = jest.fn(() => ({ __mockAuth__: true }));
  const signInWithCredential = jest.fn(async () => ({ user: { uid: 'test-uid' } }));

  const OAuthProvider = Object.assign(
    jest.fn(function (this: { providerId?: string }, providerId: string) {
      this.providerId = providerId;
    }),
    {
      credential: jest.fn(() => ({
        _type: 'apple-credential',
        idToken: 'apple-id-token.jwt',
        rawNonce: 'dGVzdF9ub25jZV9iYXNlNjR1cmwzMjg0NTY3ODkw',
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
/* Centralized Firebase Client Mock    */
/* ---------------------------------- */
jest.mock('@/lib/firebaseClient', () => {
  const mockAuth = { __mockAuth__: true };
  return {
    __esModule: true,
    getFirebaseAuth: jest.fn(() => mockAuth),
    ensureAuthInitialized: jest.fn().mockResolvedValue(mockAuth),
    getFirestoreDb: jest.fn(() => ({})),
    __resetFirebaseClientForTests__: jest.fn(),
  };
});

/* ---------------------------------- */
/* Apple Auth Mock                     */
/* ---------------------------------- */
jest.mock('expo-apple-authentication', () => ({
  __esModule: true,
  isAvailableAsync: jest.fn().mockResolvedValue(true),
  signInAsync: jest.fn().mockResolvedValue({
    user: 'apple-test-user',
    fullName: { givenName: 'Test', familyName: 'User' },
    email: 'test@example.com',
    identityToken: 'apple-id-token.jwt',
    authorizationCode: 'test.code',
  }),
    AppleAuthenticationScope: { FULL_NAME: 'FULL_NAME', EMAIL: 'EMAIL' },
    AppleAuthenticationCredentialState: { AUTHORIZED: 1 },
}));

/* ---------------------------------- */
/* Expo Constants Mock                 */
/* ---------------------------------- */
jest.mock('expo-constants', () => ({
  __esModule: true,
  default: {
    appOwnership: 'standalone',
    expoConfig: { scheme: 'oli' },
  },
}));

/* ---------------------------------- */
/* Expo Device Mock                    */
/* ---------------------------------- */
jest.mock(
  'expo-device',
  () => ({
    __esModule: true,
    isDevice: true,
  }),
  { virtual: true }
);

/* ---------------------------------- */
/* Safe Area Mock (FIXED)             */
/* ---------------------------------- */
jest.mock('react-native-safe-area-context', () => {
  const React = require('react');

  const SafeAreaView = ({ children, ...rest }: any) =>
    React.createElement('div', rest, children);

  const SafeAreaProvider = ({ children, ...rest }: any) =>
    React.createElement('div', rest, children);

  return {
    __esModule: true,
    SafeAreaView,
    SafeAreaProvider,
    SafeAreaInsetsContext: {
      Consumer: ({ children }: any) =>
        children({ top: 0, left: 0, right: 0, bottom: 0 }),
      Provider: ({ children }: any) => children,
    },
    useSafeAreaInsets: () => ({
      top: 0,
      bottom: 0,
      left: 0,
      right: 0,
    }),
    initialWindowSafeAreaInsets: { top: 0, left: 0, right: 0, bottom: 0 },
  };
});

/* ---------------------------------- */
/* Gesture Handler Mock (no RN View)   */
/* ---------------------------------- */
jest.mock('react-native-gesture-handler', () => {
  const React = require('react');

  const createStub = (_displayName: string) => {
    const Comp = ({ children, ...props }: any) =>
      React.createElement('div', props, children);
    return Comp;
  };

  return {
    __esModule: true,
    GestureHandlerRootView: createStub('GestureHandlerRootView'),
    PanGestureHandler: createStub('PanGestureHandler'),
    TapGestureHandler: createStub('TapGestureHandler'),
    State: {},
    Directions: {},
  };
});

/* ---------------------------------- */
/* Expo Router Mock                    */
/* ---------------------------------- */
jest.mock('expo-router', () => {
  const React = require('react');
  const mockReplace = jest.fn();
  const mockPush = jest.fn();
  const mockUsePathname = jest.fn(() => '/');

  return {
    __esModule: true,
    Stack: ({ children }: any) => React.createElement(React.Fragment, null, children),
    Slot: ({ children }: any) => React.createElement(React.Fragment, null, children),
    Redirect: ({ href }: { href: string }) => {
      mockReplace(href);
      return null;
    },
    useRouter: () => ({ replace: mockReplace, push: mockPush }),
    useSegments: jest.fn(() => []),
    usePathname: mockUsePathname,

    __mockReplace: mockReplace,
    __mockPush: mockPush,
    __mockUsePathname: mockUsePathname,
  };
});

/* ---------------------------------- */
/* Theme + AuthProvider mocks          */
/* ---------------------------------- */
jest.mock('@/theme', () => {
  const ThemeProvider = ({ children }: any) => children ?? null;
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
  const AuthProvider = ({ children }: any) => children ?? null;

  return {
    __esModule: true,
    default: AuthProvider,
    AuthProvider,
    useAuth,
  };
});
