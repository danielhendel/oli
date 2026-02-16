// jest.app.config.js
module.exports = {
    preset: "jest-expo",
    testEnvironment: "node",
    // ...
    setupFiles: ["<rootDir>/tests/setup/jest-setup.ts"],
    setupFilesAfterEnv: ["@testing-library/jest-native/extend-expect"]
  };
  