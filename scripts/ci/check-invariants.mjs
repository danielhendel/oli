#!/usr/bin/env node
/* eslint-disable no-console */
import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();

function fail(msg) {
  console.error(`\n❌ Invariant check failed:\n${msg}\n`);
  process.exit(1);
}

function readText(filePath) {
  return fs.readFileSync(filePath, "utf8");
}

function walk(dir, { includeExts = null, ignoreDirs = [] } = {}) {
  const out = [];
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
 * CHECK 1 — No public admin HTTP functions
 * Rule: any Functions Gen2 HTTP endpoint that looks like "admin" or "recompute"
 * must NOT be declared with invoker: "public" (and should explicitly set private).
 *
 * This is a static guardrail; it won’t prove cloud IAM, but it prevents future
 * “oops deployed public” regressions in code.
 */
function checkAdminHttpNotPublic() {
  const base = path.join(ROOT, "services", "functions", "src");
  if (!fs.existsSync(base)) return;

  const files = walk(base, {
    includeExts: [".ts"],
    ignoreDirs: ["__tests__", "dist", "lib"],
  });

  const offenders = [];

  for (const f of files) {
    const text = readText(f);

    // Heuristic: files that define admin/recompute HTTP endpoints
    const looksAdmin = /adminhttp|recompute|admin\s*http/i.test(text) || /\/admin/i.test(text);
    const usesOnRequest = /\bonRequest\s*\(/.test(text);
    if (!looksAdmin || !usesOnRequest) continue;

    // If explicitly public, fail
    if (/invoker\s*:\s*["']public["']/.test(text)) {
      offenders.push({ file: f, reason: "invoker: 'public' on admin/recompute http function" });
      continue;
    }

    // If no invoker specified at all, flag as “must specify”
    // (your repo already had public IAM drift; force explicitness)
    const hasInvoker = /invoker\s*:/.test(text);
    if (!hasInvoker) {
      offenders.push({ file: f, reason: "missing explicit invoker on admin/recompute http function" });
    }
  }

  if (offenders.length) {
    const msg =
      offenders
        .map((o) => `- ${rel(o.file)} — ${o.reason}`)
        .join("\n") +
      `\n\nFix: set invoker explicitly (recommended: invoker: "private") on admin/recompute onRequest() endpoints.`;
    fail(`CHECK 1 (Admin HTTP not public) failed:\n${msg}`);
  }

  console.log("✅ CHECK 1 passed: Admin/recompute HTTP endpoints are not declared public and require explicit invoker.");
}

/**
 * CHECK 2 — Client must not write derived truth
 * Rule: app/ and lib/ must not write to /dailyFacts, /insights, /intelligenceContext, /events.
 * We scan for Firestore write calls + derived collection names.
 */
function checkClientNoDerivedWrites() {
  const targets = [
    path.join(ROOT, "app"),
    path.join(ROOT, "lib"),
  ].filter(fs.existsSync);

  if (!targets.length) return;

  const files = targets.flatMap((t) =>
    walk(t, { includeExts: [".ts", ".tsx"], ignoreDirs: ["__tests__", "dist", "lib"] })
  );

  const writeFns = /\b(addDoc|setDoc|updateDoc|deleteDoc|writeBatch|runTransaction)\b/;
  const derived = /\b(dailyFacts|insights|intelligenceContext|events)\b/;

  const offenders = [];

  for (const f of files) {
    const text = readText(f);
    if (!writeFns.test(text)) continue;
    if (!derived.test(text)) continue;

    // Narrow: derived collection AND a write function in same file is suspicious enough for CI tripwire
    offenders.push(rel(f));
  }

  if (offenders.length) {
    fail(
      `CHECK 2 (Client no derived writes) failed:\n` +
        offenders.map((p) => `- ${p}`).join("\n") +
        `\n\nFix: clients must only read derived collections; all writes go through the backend ingestion API.`
    );
  }

  console.log("✅ CHECK 2 passed: No client-side writes to derived truth collections detected.");
}

/**
 * CHECK 3 — Ingestion routes must enforce idempotency
 * Rule: any API POST route under /usersMe or /events ingestion must read Idempotency-Key
 * header (or otherwise derive deterministic id).
 *
 * This is a static “smoke check” to prevent accidentally adding a new ingestion route
 * that writes random UUIDs on retries.
 */
function checkApiIdempotency() {
  const routesDir = path.join(ROOT, "services", "api", "src", "routes");
  if (!fs.existsSync(routesDir)) return;

  const files = walk(routesDir, { includeExts: [".ts"], ignoreDirs: ["__tests__", "dist", "lib"] });

  const offenders = [];

  for (const f of files) {
    const text = readText(f);

    // Only care about POST routes (ingestion)
    if (!/\brouter\.post\s*\(/.test(text)) continue;

    // If this file contains ingestiony routes, require Idempotency-Key usage somewhere in the file.
    // Heuristic targets: usersMe routes and events ingestion routes.
    const relevant = /usersMe|users\/me|\/events|ingest/i.test(text);
    if (!relevant) continue;

    const hasIdemHeader =
      /Idempotency-Key/i.test(text) &&
      /(req\.header\(|req\.headers|\bgetHeader\b)/i.test(text);

    if (!hasIdemHeader) {
      offenders.push(rel(f));
    }
  }

  if (offenders.length) {
    fail(
      `CHECK 3 (API idempotency) failed:\n` +
        offenders.map((p) => `- ${p}`).join("\n") +
        `\n\nFix: ingestion POST routes must read Idempotency-Key and use deterministic write IDs (or equivalent request record).`
    );
  }

  console.log("✅ CHECK 3 passed: API ingestion routes appear to enforce Idempotency-Key.");
}

function main() {
  console.log("Running Oli constitutional invariant CI checks...\n");
  checkAdminHttpNotPublic();
  checkClientNoDerivedWrites();
  checkApiIdempotency();
  console.log("\n✅ All invariant checks passed.");
}

main();
