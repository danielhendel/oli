// apps/mobile/jest.config.js
// Jest config for Expo SDK 54 + React Native (Node env)
//
// - No jest-expo preset (avoids brittle internal setup issues)
// - Uses Node test environment (good for logic + RN tests)
// - Uses babel-jest with babel-preset-expo via babel.config.js
// - Keeps RN/Expo modules transformed so imports work
// - Loads our custom jest-setup (mocks for Expo/Firebase/router)

module.exports = {
  // We run everything in Node; individual tests can still
  // override with `/** @jest-environment jsdom */` if needed.
  testEnvironment: 'node',

  // Load our global mocks & polyfills
  setupFiles: [
    '<rootDir>/jest-setup.ts',
  ],

  // RTL matchers (works fine in Node env with React Native Testing Library)
  setupFilesAfterEnv: [
    '@testing-library/jest-native/extend-expect',
  ],

  // Use babel-jest + babel.config.js (which already has babel-preset-expo)
  transform: {
    '^.+\\.[jt]sx?$': 'babel-jest',
  },

  // Make sure RN/Expo modules get transformed, not ignored
  transformIgnorePatterns: [
    'node_modules/(?!(jest-)?react-native|@react-native|react-native' +
      '|@react-navigation/.*' +
      '|expo(nent)?|@expo(nent)?/.*|expo-.*|@expo-.*' +
      '|react-native-reanimated' +
      ')',
  ],

  // Support @/* alias → <rootDir>/*
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/$1',
  },

  testPathIgnorePatterns: ['/node_modules/', '/android/', '/ios/'],

  // Keep Jest from spawning tons of workers in CI
  maxWorkers: 2,
};
