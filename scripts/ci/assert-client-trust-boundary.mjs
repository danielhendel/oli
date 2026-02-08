#!/usr/bin/env node
/**
 * CI-enforced client trust boundary guard.
 *
 * Fails if:
 * 1. fetch( occurs anywhere except lib/api/http.ts
 * 2. apiGetJsonAuthed( is used outside lib/api/validate.ts (and allowed debug paths)
 * 3. Phase 1 screens import from non-Zod API helpers (lib/api/http)
 */
import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();

function fail(msg) {
  console.error(`\n❌ Client trust boundary guard failed:\n${msg}\n`);
  process.exit(1);
}

function readText(filePath) {
  return fs.readFileSync(filePath, "utf8");
}

function walk(dir, { includeExts = null, ignoreDirs = [] } = {}) {
  const out = [];
  if (!fs.existsSync(dir)) return out;
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const e of entries) {
    const full = path.join(dir, e.name);
    if (e.isDirectory()) {
      if (ignoreDirs.includes(e.name)) continue;
      out.push(...walk(full, { includeExts, ignoreDirs }));
    } else {
      if (includeExts) {
        const ext = path.extname(e.name).toLowerCase();
        if (!includeExts.includes(ext)) continue;
      }
      out.push(full);
    }
  }
  return out;
}

function rel(p) {
  return path.relative(ROOT, p);
}

/**
 * CHECK 1 — fetch( only in lib/api/http.ts
 */
function checkFetchOnlyInHttp() {
  const allowedPath = path.join(ROOT, "lib", "api", "http.ts");
  const allowedRel = rel(allowedPath);

  const clientDirs = [
    path.join(ROOT, "app"),
    path.join(ROOT, "lib"),
    path.join(ROOT, "components"),
  ].filter((d) => fs.existsSync(d));

  const files = clientDirs.flatMap((d) =>
    walk(d, { includeExts: [".ts", ".tsx"], ignoreDirs: ["__tests__", "dist", "node_modules"] }),
  );

  const fetchRx = /(?:^|[^\w])fetch\s*\(/;
  const offenders = [];

  for (const f of files) {
    const text = readText(f);
    if (!fetchRx.test(text)) continue;
    const r = rel(f);
    if (r === allowedRel) continue;
    offenders.push(r);
  }

  if (offenders.length) {
    fail(
      `CHECK 1 (fetch only in http.ts) failed:\n` +
        `- fetch( must only appear in lib/api/http.ts\n` +
        `- Offenders:\n` +
        offenders.map((p) => `  - ${p}`).join("\n") +
        `\nFix: All network calls must go through lib/api/http.ts. Use apiGetZodAuthed (via usersMe, failures, derivedLedgerMe) for Phase 1 surfaces.`,
    );
  }

  console.log("✅ CHECK 1 passed: fetch( only in lib/api/http.ts");
}

/**
 * CHECK 2 — apiGetJsonAuthed( only in lib/api/validate.ts (and allowed debug paths)
 */
function checkApiGetJsonAuthedOnlyInValidate() {
  const allowedPatterns = [
    /^lib\/api\/validate\.ts$/,
    /^app\/debug\//,
    /^lib\/debug\//,
  ];

  function isAllowed(r) {
    return allowedPatterns.some((p) => p.test(r.replace(/\\/g, "/")));
  }

  const clientDirs = [
    path.join(ROOT, "app"),
    path.join(ROOT, "lib"),
    path.join(ROOT, "components"),
  ].filter((d) => fs.existsSync(d));

  const files = clientDirs.flatMap((d) =>
    walk(d, { includeExts: [".ts", ".tsx"], ignoreDirs: ["__tests__", "dist", "node_modules"] }),
  );

  const rx = /\bapiGetJsonAuthed\s*\(/;
  const offenders = [];

  for (const f of files) {
    const text = readText(f);
    if (!rx.test(text)) continue;
    const r = rel(f);
    if (isAllowed(r)) continue;
    offenders.push(r);
  }

  if (offenders.length) {
    fail(
      `CHECK 2 (apiGetJsonAuthed only in validate) failed:\n` +
        `- apiGetJsonAuthed( may only be used in lib/api/validate.ts or app/debug, lib/debug\n` +
        `- Offenders:\n` +
        offenders.map((p) => `  - ${p}`).join("\n") +
        `\nFix: Use apiGetZodAuthed (via lib/api/validate) or typed API modules (usersMe, failures, derivedLedgerMe) for Zod-validated server truth.`,
    );
  }

  console.log("✅ CHECK 2 passed: apiGetJsonAuthed( only in validate.ts or debug paths");
}

/**
 * CHECK 3 — Phase 1 screens must not import from lib/api/http (non-Zod API helpers)
 */
function checkPhase1ScreensNoRawHttpImport() {
  const phase1Dirs = [
    path.join(ROOT, "app", "(app)", "(tabs)", "timeline"),
    path.join(ROOT, "app", "(app)", "(tabs)", "library"),
    path.join(ROOT, "app", "(app)", "failures"),
  ].filter((d) => fs.existsSync(d));

  const files = phase1Dirs.flatMap((d) =>
    walk(d, { includeExts: [".ts", ".tsx"], ignoreDirs: ["__tests__", "dist"] }),
  );

  const httpImportRx = /from\s+["'](?:@\/lib\/api\/http|\.\.\/.*lib\/api\/http)["']/;
  const offenders = [];

  for (const f of files) {
    const text = readText(f);
    if (!httpImportRx.test(text)) continue;
    offenders.push(rel(f));
  }

  if (offenders.length) {
    fail(
      `CHECK 3 (Phase 1 screens no raw HTTP import) failed:\n` +
        `- Phase 1 screens (timeline, library, failures) must not import from lib/api/http\n` +
        `- Offenders:\n` +
        offenders.map((p) => `  - ${p}`).join("\n") +
        `\nFix: Phase 1 screens must use lib/data hooks (useTimeline, useLineage, useEvents, useFailures, useDerivedLedgerRuns, useDerivedLedgerSnapshot) which go through Zod-validated API modules.`,
    );
  }

  console.log("✅ CHECK 3 passed: Phase 1 screens do not import from lib/api/http");
}

function main() {
  console.log("Running client trust boundary guards...\n");

  checkFetchOnlyInHttp();
  checkApiGetJsonAuthedOnlyInValidate();
  checkPhase1ScreensNoRawHttpImport();

  console.log("\n✅ All client trust boundary checks passed.");
}

main();
