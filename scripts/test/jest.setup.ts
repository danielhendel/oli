// scripts/test/jest.setup.ts
//
// Console discipline: fail tests on unexpected console.log, console.error, console.warn.
// console.log: zero tolerance (no escape hatch).
// Escape hatch for error/warn: allowConsoleForThisTest({ error: [/.../], warn: [/.../] }) or
// withConsoleSpy({ allowError, allowWarn }, fn) — see scripts/test/consoleGuard.ts

import {
  clearUnexpected,
  failIfUnexpected,
  installConsoleGuard,
} from "./consoleGuard";

installConsoleGuard();

beforeEach(() => {
  clearUnexpected();
});

afterEach(() => {
  failIfUnexpected();
});
