// lib/ui/__tests__/ProvenanceDrawer.boundary.test.ts
// Phase 1.5 Sprint 5 — ProvenanceDrawer must not import firebase or lib/api

/**
 * @jest-environment node
 */

import fs from "node:fs";
import path from "node:path";

const PROVENANCE_DRAWER_PATH = path.resolve(
  process.cwd(),
  "lib/ui/ProvenanceDrawer.tsx",
);

const FORBIDDEN_SUBSTRINGS = [
  "firebase",
  "firestore",
  "lib/api",
  "useHealth",
];

describe("ProvenanceDrawer boundary", () => {
  it("does not import firebase, firestore, lib/api, or useHealth", () => {
    const content = fs.readFileSync(PROVENANCE_DRAWER_PATH, "utf8");
    const importOrRequireLines = content
      .split("\n")
      .filter(
        (line) =>
          line.trimStart().startsWith("import ") ||
          line.includes("require("),
      );
    const combined = importOrRequireLines.join(" ").toLowerCase();
    for (const forbidden of FORBIDDEN_SUBSTRINGS) {
      expect(combined).not.toContain(forbidden.toLowerCase());
    }
  });
});
