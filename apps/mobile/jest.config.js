// Jest config for Expo SDK 54 + React Native on Node 20
// - Uses jest-expo/node (no jsdom issues)
// - Loads our polyfills/mocks before tests
// - Works for both RN component tests and logic tests

module.exports = {
  preset: 'jest-expo/node',
  testEnvironment: 'node',

  setupFiles: [
    '<rootDir>/jest-setup.ts', // loads fetch polyfill + Expo/Firebase mocks BEFORE tests
  ],

  setupFilesAfterEnv: [
    '@testing-library/jest-native/extend-expect', // RTL matchers
  ],

  transformIgnorePatterns: [
    'node_modules/(?!(jest-)?react-native|@react-native|react-native' +
      '|@react-navigation/.*' +
      '|expo(nent)?|@expo(nent)?/.*|expo-.*|@expo-.*' +
      '|react-native-reanimated' +
      ')',
  ],

  // ⬇️ Override preset's react-native → react-native-web mapping
  moduleNameMapper: {
    '^react-native$': 'react-native',
    '^@/(.*)$': '<rootDir>/$1',
  },

  testPathIgnorePatterns: ['/node_modules/', '/android/', '/ios/'],

  maxWorkers: 2,
};
