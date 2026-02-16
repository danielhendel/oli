/* Minimal TS lint config */
module.exports = {
  root: true,
  parserOptions: { project: true, tsconfigRootDir: __dirname },
  extends: ['standard-with-typescript'],
  ignorePatterns: ['dist/**'],
  rules: {
    '@typescript-eslint/strict-boolean-expressions': 'off'
  }
};
