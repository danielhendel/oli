// Minimal, compatible ESLint config for this package (ESLint v8, eslintrc mode)
module.exports = {
  root: true,
  env: { es2022: true, node: true, jest: true },
  parser: "@typescript-eslint/parser",
  parserOptions: {
    ecmaVersion: 2022,
    sourceType: "module",
  },
  plugins: ["@typescript-eslint"],
  extends: [
    "eslint:recommended",
    "plugin:@typescript-eslint/recommended",
    "prettier",
  ],
  rules: {
    // --- FIX for the crash you’re seeing ---
    "@typescript-eslint/no-unused-expressions": "off",
    "no-unused-expressions": "off",

    // keep the helpful unused-vars behavior
    "@typescript-eslint/no-unused-vars": ["warn", { argsIgnorePattern: "^_" }],
  },
  overrides: [
    {
      files: ["**/*.test.ts", "**/*.test.tsx", "**/__tests__/**/*.{ts,tsx,js}"],
      rules: {
        "@typescript-eslint/no-explicit-any": "off",
        "@typescript-eslint/no-var-requires": "off",
      },
    },
    {
      files: ["**/*.{js,cjs,mjs}"],
      rules: {
        "@typescript-eslint/no-var-requires": "off",
      },
    },
  ],
  ignorePatterns: [
    "node_modules/",
    "dist/",
    "build/",
    "web-build/",
    "ios/",
    "android/",
    ".expo/",
    ".expo-shared/",
    "coverage/",
    ".artifacts/",
    "expo-env.d.ts",
    // keep API build output out of lint:
    "services/api/dist/",
  ],
};
