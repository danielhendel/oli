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

installConsoleGuard();

beforeEach(() => {
  clearUnexpected();
});

afterEach(() => {
  failIfUnexpected();
});
