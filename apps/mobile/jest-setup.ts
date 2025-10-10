/* eslint-env jest */
/* global jest */

export {};

// ✅ Provide a virtual mock so Jest doesn't attempt to resolve the real module
jest.mock(
  'firebase/auth/react-native',
  () => ({
    getReactNativePersistence: () => ({}),
  }),
  { virtual: true }
);
