// Jest config for Expo SDK 54 + React Native
// Keep all RN/Expo packages in transform, map "@/x" to "<rootDir>/x"

module.exports = {
  preset: 'jest-expo',
  testEnvironment: 'node',
  setupFilesAfterEnv: ['@testing-library/jest-native/extend-expect'],
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
  // Keep tests snappy in CI
  maxWorkers: 2,
};
