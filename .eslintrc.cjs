/** @type {import('eslint').Linter.Config} */
module.exports = {
  root: true,
  extends: ["expo", "plugin:@typescript-eslint/recommended", "prettier"],
  parser: "@typescript-eslint/parser",
  plugins: ["@typescript-eslint"],
  ignorePatterns: ["node_modules", "dist", "build", ".expo", ".expo-shared"],
  rules: {
    "@typescript-eslint/no-unused-vars": ["warn", { argsIgnorePattern: "^_" }],
  },
};
