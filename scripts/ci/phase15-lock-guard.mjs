#!/usr/bin/env node
/**
 * Phase 1.5 Lock Guard — CI drift guard for governance/phase15-lock invariants.
 * Fails CI if any Phase 1.5 lock invariant drifts. Governance-only; no product behavior changes.
 */

import fs from "fs";
import path from "path";

const ROOT = path.resolve(process.cwd());

function assertFileExists(filePath) {
  const full = path.isAbsolute(filePath) ? filePath : path.join(ROOT, filePath);
  if (!fs.existsSync(full)) {
    console.error(`[Phase 1.5 Lock Guard] FAIL: required file missing: ${filePath}`);
    process.exit(1);
  }
}

function assertFileContains(filePath, substring) {
  const full = path.isAbsolute(filePath) ? filePath : path.join(ROOT, filePath);
  const content = fs.readFileSync(full, "utf8");
  if (!content.includes(substring)) {
    console.error(`[Phase 1.5 Lock Guard] FAIL: file must contain "${substring}": ${filePath}`);
    process.exit(1);
  }
}

function assertFileNotContains(filePath, substring) {
  const full = path.isAbsolute(filePath) ? filePath : path.join(ROOT, filePath);
  const content = fs.readFileSync(full, "utf8");
  if (content.includes(substring)) {
    console.error(`[Phase 1.5 Lock Guard] FAIL: file must NOT contain "${substring}": ${filePath}`);
    process.exit(1);
  }
}

console.log("[Phase 1.5 Lock Guard] Running checks…");

// 1) Lock docs must exist
assertFileExists("docs/PHASE_1_5_LOCK_CRITERIA.md");
assertFileExists("docs/PHASE_1_5_LOCK_DECLARATION.md");

// 2) HealthSignals constants must exist and include HEALTH_SIGNALS_MODEL_VERSION + SIGNAL_THRESHOLDS
const constantsPath = "services/functions/src/healthSignals/constants.ts";
assertFileExists(constantsPath);
assertFileContains(constantsPath, "HEALTH_SIGNALS_MODEL_VERSION");
assertFileContains(constantsPath, "SIGNAL_THRESHOLDS");

// 3) Derived ledger must still contain hasHealthSignals
const derivedLedgerPath = "services/functions/src/pipeline/derivedLedger.ts";
assertFileExists(derivedLedgerPath);
assertFileContains(derivedLedgerPath, "hasHealthSignals");

// 4) Dash screen must NOT import firebase/firestore
const dashPath = "app/(app)/(tabs)/dash.tsx";
assertFileExists(dashPath);
assertFileNotContains(dashPath, "firebase");
assertFileNotContains(dashPath, "firestore");

// 5) Console guard must still exist
assertFileExists("scripts/test/consoleGuard.ts");

console.log("[Phase 1.5 Lock Guard] All checks passed.");
