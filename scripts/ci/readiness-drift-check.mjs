#!/usr/bin/env node
/**
 * Phase 1 Lock #3 — Readiness drift check.
 *
 * Fails if non-canonical readiness strings appear in app/lib/components.
 * Canonical: missing | partial | ready | error
 * Disallowed: loading, empty, invalid, not-ready, unknown, unready, pending, coming_soon
 */
import fs from "node:fs";
import path from "node:path";

const DISALLOWED = [
  "loading",
  "empty",
  "invalid",
  "not-ready",
  "unknown",
  "unready",
  "pending",
  "coming_soon",
];

// Match status: "X" or state: "X" where X is a disallowed string (readiness-like context)
// Exclude network: "loading" (NetworkStatus in resolveReadiness is different from readiness)
const READINESS_LIKE_PATTERN = new RegExp(
  `(?:^|[^\\w])(?:status|state)\\s*:\\s*["'](${DISALLOWED.join("|")})["']`,
  "g",
);

/**
 * Scan file content for disallowed readiness strings in status/state context.
 * @param {string} content - File content
 * @returns {string[]} - List of disallowed values found
 */
export function scanContentForReadinessDrift(content) {
  const found = [];
  let m;
  // eslint-disable-next-line no-cond-assign
  while ((m = READINESS_LIKE_PATTERN.exec(content)) !== null) {
    found.push(m[1]);
  }
  return found;
}

/**
 * Check a single file for readiness drift.
 * @param {string} filePath - Absolute or relative path
 * @param {string} content - File content
 * @returns {{ ok: boolean; offenders: { path: string; values: string[] }[] }}
 */
export function checkFileForReadinessDrift(filePath, content) {
  const values = scanContentForReadinessDrift(content);
  if (values.length === 0) return { ok: true, offenders: [] };
  return { ok: false, offenders: [{ path: filePath, values }] };
}

/**
 * Walk directory and collect .ts/.tsx files, excluding __tests__ and *.test.*
 */
function walkScanTargets(root, { includeExts = [".ts", ".tsx"], ignoreDirs = ["__tests__"] } = {}) {
  const out = [];
  const entries = fs.readdirSync(root, { withFileTypes: true });
  for (const e of entries) {
    const full = path.join(root, e.name);
    if (e.isDirectory()) {
      if (ignoreDirs.includes(e.name)) continue;
      out.push(...walkScanTargets(full, { includeExts, ignoreDirs }));
    } else {
      const ext = path.extname(e.name).toLowerCase();
      if (!includeExts.includes(ext)) continue;
      if (e.name.includes(".test.")) continue;
      out.push(full);
    }
  }
  return out;
}

/**
 * Run full readiness drift check on app, lib, components.
 * @param {string} projectRoot - Project root
 * @returns {{ ok: boolean; offenders: { path: string; values: string[] }[] }}
 */
export function runReadinessDriftCheck(projectRoot) {
  const targets = ["app", "lib", "components"]
    .map((d) => path.join(projectRoot, d))
    .filter((p) => fs.existsSync(p));

  const allOffenders = [];

  for (const dir of targets) {
    const files = walkScanTargets(dir);
    for (const f of files) {
      const content = fs.readFileSync(f, "utf8");
      const rel = path.relative(projectRoot, f);
      const { offenders } = checkFileForReadinessDrift(rel, content);
      allOffenders.push(...offenders);
    }
  }

  return {
    ok: allOffenders.length === 0,
    offenders: allOffenders,
  };
}
