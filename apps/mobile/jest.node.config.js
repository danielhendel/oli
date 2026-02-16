// Node-only Jest config (for Firebase probe and other non-DOM tests)
module.exports = {
    preset: 'jest-expo/node',
    testEnvironment: 'node',
    setupFiles: ['<rootDir>/jest-setup.ts'],
    setupFilesAfterEnv: [], // no RTL matchers needed
    transformIgnorePatterns: [
      'node_modules/(?!(jest-)?react-native|@react-native|expo|@expo|expo-router)'
    ],
    moduleNameMapper: {
      '^@/(.*)$': '<rootDir>/$1'
    },
    testPathIgnorePatterns: ['/node_modules/', '/android/', '/ios/'],
    maxWorkers: 2
  };
  