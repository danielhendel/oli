// apps/mobile/jest.config.js
module.exports = {
  preset: "jest-expo",
  testEnvironment: "jsdom",
  setupFilesAfterEnv: [
    "@testing-library/jest-native/extend-expect",
    "<rootDir>/jest-setup.ts",
  ],
  transformIgnorePatterns: [
    "node_modules/(?!(jest-)?react-native|@react-native|react-native"
      + "|@react-navigation/.*"
      + "|expo(nent)?|@expo(nent)?/.*|expo-.*|@expo-.*"
      + "|react-native-reanimated"
      + ")",
  ],
  moduleNameMapper: {
    "^@/lib/firebase/core$": "<rootDir>/__mocks__/firebase-core.jest.ts",
    "^@/(.*)$": "<rootDir>/$1",
  },
  testPathIgnorePatterns: [
    "/node_modules/",
    "/android/",
    "/ios/",
    "__tests__/firestore.rules.spec.ts",
    "__tests__/firestore.dal.spec.ts",
  ],
  maxWorkers: 2,
};
