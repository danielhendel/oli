// tests/setup/jest-setup.ts
/* eslint-env jest */

// Expo Router: provide Jest mocks/shims
jest.mock("expo-router", () => require("expo-router/jest"));

// Neutralize native Sentry in tests
jest.mock("@sentry/react-native", () => ({
  init: jest.fn(),
  captureException: jest.fn(),
  withScope: jest.fn(),
  configureScope: jest.fn(),
}));

// Keep Constants.extra defined so code that reads it won't crash
jest.mock("expo-constants", () => ({
  expoConfig: { extra: {} },
}));

// React Native Reanimated mock (required by many RN libs)
jest.mock("react-native-reanimated", () =>
  require("react-native-reanimated/mock")
);

// Ensure this is a module (avoids isolatedModules complaints)
export {};
