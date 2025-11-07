// Jest config for Expo SDK 54 + React Native
// - Keep RN/Expo modules transformed
// - Load our polyfills/mocks before tests
// - Use jsdom for RN tests; override to node in specific tests when needed

module.exports = {
  preset: 'jest-expo',
  testEnvironment: 'jsdom',
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
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/$1',
  },
  testPathIgnorePatterns: ['/node_modules/', '/android/', '/ios/'],
  maxWorkers: 2,
};
