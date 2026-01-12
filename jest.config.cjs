/** @type {import('jest').Config} */
module.exports = {
    preset: "jest-expo",
    setupFilesAfterEnv: ["<rootDir>/jest.setup.ts"],
  
    transformIgnorePatterns: [
      "node_modules/(?!(jest-)?expo|@expo(nent)?/.*|@expo-google-fonts/.*|react-native|@react-native(-community)?/.*|@react-navigation/.*|firebase/.*)"
    ],
  
    moduleNameMapper: {
      "^@/(.*)$": "<rootDir>/app/$1",
      "^@oli/contracts$": "<rootDir>/lib/contracts/index.ts",
      "^@oli/contracts/(.*)$": "<rootDir>/lib/contracts/$1"
    },
  
    // Only treat real source tests as tests
    // Prevents *.test.d.ts and generated artifacts from being executed
    testMatch: [
      "**/?(*.)+(test|spec).ts",
      "**/?(*.)+(test|spec).tsx",
      "**/?(*.)+(test|spec).js",
      "**/?(*.)+(test|spec).jsx"
    ],
  
    testPathIgnorePatterns: [
      "<rootDir>/node_modules/",
      "<rootDir>/dist/",
      "<rootDir>/build/",
      "<rootDir>/coverage/",
      "<rootDir>/archive/",
      "<rootDir>/dist-types/",
      "<rootDir>/services/functions/lib/",
      "<rootDir>/services/api/lib/",
  
      // Local proof bundles (Sprint 3)
      "<rootDir>/.repo-proof/",
      "<rootDir>/.sprint3-proof/",
  
      // Audit artifacts (prevents haste-map collisions)
      "<rootDir>/oli-audit-closure/"
    ],
  
    modulePathIgnorePatterns: [
      "<rootDir>/archive/",
      "<rootDir>/dist-types/",
      "<rootDir>/services/functions/lib/",
      "<rootDir>/services/api/lib/",
  
      // Local proof bundles
      "<rootDir>/.repo-proof/",
      "<rootDir>/.sprint3-proof/",
  
      // Audit artifacts
      "<rootDir>/oli-audit-closure/"
    ]
  };
  