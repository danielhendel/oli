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

installConsoleGuard();

beforeEach(() => {
  clearUnexpected();
});

afterEach(() => {
  failIfUnexpected();
});
