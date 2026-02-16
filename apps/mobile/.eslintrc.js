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

  // Global JS/TS-neutral rules (none special yet)
  rules: {},

  overrides: [
    // ✅ Core TypeScript rules (including Firestore guard)
    {
      files: ['**/*.ts', '**/*.tsx'],
      rules: {
        // ⛔ Block Firestore imports in all TS files by default
        '@typescript-eslint/no-restricted-imports': [
          'error',
          {
            paths: [
              {
                name: 'firebase/firestore',
                message:
                  'Do not import Firestore directly in screens/components/hooks. Use typed DAL in lib/db/* or "@/lib/firebaseClient".',
              },
            ],
            patterns: ['firebase/firestore*'],
          },
        ],
      },
    },

    // ✅ Allow Firestore imports inside the DAL only
    {
      files: ['lib/db/**/*.ts', 'lib/db/**/*.tsx'],
      rules: {
        '@typescript-eslint/no-restricted-imports': 'off',
      },
    },

    // ✅ Treat our Node startup scripts explicitly as Node
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

    // ✅ Jest mocks
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

    // ✅ Other helper scripts under scripts/
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
