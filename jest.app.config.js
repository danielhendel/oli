// jest.app.config.js
module.exports = {
  preset: "jest-expo",
  testEnvironment: "node",
  testMatch: [
    "<rootDir>/app/**/*.(test|spec).(ts|tsx)",
    "<rootDir>/components/**/*.(test|spec).(ts|tsx)",
    "<rootDir>/lib/**/*.(test|spec).(ts|tsx)",
    "<rootDir>/__tests__/**/*.(test|spec).(ts|tsx)"
  ],
  testPathIgnorePatterns: [
    "<rootDir>/node_modules/",
    "<rootDir>/cloudrun/",
    "<rootDir>/(dist|build)/"
  ],
  transformIgnorePatterns: [
    "node_modules/(?!(react-native"
      + "|@react-native"
      + "|react-native-"
      + "|expo(nent)?"
      + "|@expo"
      + "|expo-router"
      + "|@expo/vector-icons"
      + "|@unimodules"
      + "|unimodules"
      + "|sentry-expo"
      + "|@sentry"
      + "|@react-navigation"
      + ")/)"
  ],
  moduleNameMapper: {
    "^@/(.*)$": "<rootDir>/$1"
  },
  setupFiles: ["<rootDir>/tests/setup/jest-setup.ts"],
  setupFilesAfterEnv: ["@testing-library/jest-native/extend-expect"]
};
