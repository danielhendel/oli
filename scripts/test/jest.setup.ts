// scripts/test/jest.setup.ts
//
// Console discipline: fail tests on unexpected console.error/console.warn.
// Escape hatch: allowConsoleForThisTest({ error: [/.../], warn: [/.../] }) or
// withConsoleSpy({ allowError, allowWarn }, fn) — see scripts/test/consoleGuard.ts

import {
  clearUnexpected,
  failIfUnexpected,
  installConsoleGuard,
} from "./consoleGuard";

jest.mock("@expo/vector-icons", () => {
  const React = require("react");
  const { Text } = require("react-native");
  const MockIcon = ({ name, ...rest }: { name: string }) =>
    React.createElement(Text, rest, name);
  return {
    __esModule: true,
    Ionicons: MockIcon,
  };
});

jest.mock("@react-native-async-storage/async-storage", () => {
  const store = new Map<string, string>();
  return {
    __esModule: true,
    default: {
      getItem: jest.fn(async (key: string) => (store.has(key) ? store.get(key)! : null)),
      setItem: jest.fn(async (key: string, value: string) => {
        store.set(key, value);
      }),
      removeItem: jest.fn(async (key: string) => {
        store.delete(key);
      }),
      clear: jest.fn(async () => {
        store.clear();
      }),
      getAllKeys: jest.fn(async () => [...store.keys()]),
      multiGet: jest.fn(async (keys: string[]) => keys.map((k) => [k, store.has(k) ? store.get(k)! : null])),
      multiSet: jest.fn(async (entries: [string, string][]) => {
        for (const [k, v] of entries) store.set(k, v);
      }),
      multiRemove: jest.fn(async (keys: string[]) => {
        for (const k of keys) store.delete(k);
      }),
      mergeItem: jest.fn(async (key: string, value: string) => {
        const prevRaw = store.get(key);
        const prev = prevRaw ? JSON.parse(prevRaw) : {};
        const next = { ...prev, ...JSON.parse(value) };
        store.set(key, JSON.stringify(next));
      }),
    },
  };
});

installConsoleGuard();

beforeEach(() => {
  clearUnexpected();
});

afterEach(() => {
  failIfUnexpected();
});
