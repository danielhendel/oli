/** ESLint config for the mobile app */
module.exports = {
  root: true,

  extends: [
    'expo',
    'plugin:@typescript-eslint/recommended',
    'plugin:react-hooks/recommended',
    'prettier',
  ],

  parser: '@typescript-eslint/parser',
  parserOptions: {
    ecmaVersion: 2022,
    sourceType: 'module',
    ecmaFeatures: { jsx: true },
  },

  env: {
    es2022: true,
  },

  settings: {
    react: { version: 'detect' },
  },

  // ⛔ Block Firestore imports in UI code. Use the typed DAL in lib/db/*.
  rules: {
    'no-restricted-imports': [
      'error',
      {
        name: 'firebase/firestore',
        message:
          'Do not import Firestore directly in screens/components/hooks. Use typed DAL in lib/db/*.',
      },
    ],
  },

  overrides: [
    // ✅ Allow Firestore imports inside the DAL only
    {
      files: ['lib/db/**/*.ts', 'lib/db/**/*.tsx'],
      rules: {
        'no-restricted-imports': 'off',
      },
    },

    // ✅ Treat our Node startup scripts explicitly as Node (so process/console are defined)
    {
      files: ['scripts/expo-start.cjs', 'scripts/prestart.cjs'],
      env: { node: true },
      rules: {
        'no-console': 'off',
        'no-undef': 'off',
      },
    },

    // ✅ Tests & Jest setup — Jest + Node globals
    {
      files: [
        '**/__tests__/**/*.[jt]s?(x)',
        '**/*.test.[jt]s?(x)',
        '**/jest-setup.ts',
        '**/jest.setup.ts',
        '**/jest.config.*',
      ],
      env: { jest: true, node: true },
      rules: { 'no-undef': 'off' },
    },

    // ✅ Jest mocks (CommonJS)
    {
      files: ['**/__mocks__/**/*.[jt]s?(x)'],
      env: { node: true, jest: true },
      rules: { 'no-undef': 'off' },
    },

    // ✅ Node configs (CommonJS)
    {
      files: [
        '*.config.js',
        '*.config.cjs',
        'babel.config.js',
        'metro.config.js',
        'jest.config.js',
        'jest.config.cjs',
        'eslint.config.js',
        'eslint.config.cjs',
        '.eslintrc.js',
      ],
      env: { node: true },
      rules: { 'no-console': 'off' },
    },

    // ✅ Any other helper scripts under scripts/ (both .cjs and .js)
    {
      files: ['scripts/**/*.cjs', 'scripts/**/*.js'],
      env: { node: true },
      rules: {
        'no-console': 'off',
        'no-undef': 'off',
      },
    },
  ],

  ignorePatterns: [
    'node_modules/',
    'dist/',
    'build/',
    '.expo/',
    '.expo-shared/',
    'coverage/',
  ],
};
