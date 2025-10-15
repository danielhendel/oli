// Jest config for Expo SDK 54 + React Native
// Keep RN/Expo packages transformed, map "@/x" to "<rootDir>/x"

module.exports = {
  preset: 'jest-expo',
  testEnvironment: 'jsdom',
  setupFilesAfterEnv: [
    '@testing-library/jest-native/extend-expect',
    '<rootDir>/jest-setup.ts', // loads Apple/Constants mocks
  ],
  transformIgnorePatterns: [
    'node_modules/(?!(jest-)?react-native|@react-native|react-native'
      + '|@react-navigation/.*'
      + '|expo(nent)?|@expo(nent)?/.*|expo-.*|@expo-.*'
      + '|react-native-reanimated'
      + ')',
  ],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/$1',
  },
  // ✅ Keep default `npm test` fast and green; run rules via `npm run test:rules`
  testPathIgnorePatterns: [
    '/node_modules/',
    '/android/',
    '/ios/',
    '__tests__/firestore.rules.spec.ts',
    '__tests__/firestore.dal.spec.ts',
  ],
  maxWorkers: 2,
};
