/* eslint-env node */

// cloudrun/jest.config.cjs
module.exports = {
  testEnvironment: "node",
  roots: ["<rootDir>/_tests"],
  transform: {
    "^.+\\.tsx?$": ["ts-jest", { tsconfig: "<rootDir>/tsconfig.json" }],
  },
  moduleFileExtensions: ["ts", "tsx", "js", "json"],
  setupFilesAfterEnv: [],
};
