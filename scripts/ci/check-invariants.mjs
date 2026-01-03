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

    const looksAdmin = /adminhttp|recompute|admin\s*http/i.test(text) || /\/admin/i.test(text);
    const usesOnRequest = /\bonRequest\s*\(/.test(text);
    if (!looksAdmin || !usesOnRequest) continue;

    if (/invoker\s*:\s*["']public["']/.test(text)) {
      offenders.push({ file: f, reason: "invoker: 'public' on admin/recompute http function" });
      continue;
    }

    const hasInvoker = /invoker\s*:/.test(text);
    if (!hasInvoker) {
      offenders.push({ file: f, reason: "missing explicit invoker on admin/recompute http function" });
    }
  }

  if (offenders.length) {
    const msg =
      offenders.map((o) => `- ${rel(o.file)} — ${o.reason}`).join("\n") +
      `\n\nFix: set invoker explicitly (recommended: invoker: "private") on admin/recompute onRequest() endpoints.`;
    fail(`CHECK 1 (Admin HTTP not public) failed:\n${msg}`);
  }

  console.log("✅ CHECK 1 passed: Admin/recompute HTTP endpoints are not declared public and require explicit invoker.");
}

/**
 * CHECK 2 — Client must not write derived truth
 */
function checkClientNoDerivedWrites() {
  const targets = [path.join(ROOT, "app"), path.join(ROOT, "lib")].filter(fs.existsSync);
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
 */
function checkApiIdempotency() {
  const routesDir = path.join(ROOT, "services", "api", "src", "routes");
  if (!fs.existsSync(routesDir)) return;

  const files = walk(routesDir, { includeExts: [".ts"], ignoreDirs: ["__tests__", "dist", "lib"] });

  const offenders = [];

  for (const f of files) {
    const text = readText(f);

    if (!/\brouter\.post\s*\(/.test(text)) continue;

    const relevant = /usersMe|users\/me|\/events|ingest/i.test(text);
    if (!relevant) continue;

    const hasIdemHeader =
      /Idempotency-Key/i.test(text) && /(req\.header\(|req\.headers|\bgetHeader\b)/i.test(text);

    if (!hasIdemHeader) offenders.push(rel(f));
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

/**
 * CHECK 4 — Cloud Run API must not start Firestore paths outside /users/{uid}/...
 */
function checkApiNoGlobalFirestoreRootCollections() {
  const base = path.join(ROOT, "services", "api", "src");
  if (!fs.existsSync(base)) return;

  const files = walk(base, {
    includeExts: [".ts"],
    ignoreDirs: ["__tests__", "dist", "lib"],
  });

  const offenders = [];

  const rootReceivers = [
    /\bgetFirestore\s*\(\s*\)\s*\.collection\s*\(\s*["']([^"']+)["']\s*\)/g,
    /\bdb\s*\.collection\s*\(\s*["']([^"']+)["']\s*\)/g,
    /\bfirestore\s*\.collection\s*\(\s*["']([^"']+)["']\s*\)/g,
  ];

  for (const f of files) {
    const text = readText(f);

    for (const rx of rootReceivers) {
      let m;
      // eslint-disable-next-line no-cond-assign
      while ((m = rx.exec(text)) !== null) {
        const col = m[1];
        if (col !== "users") offenders.push({ file: rel(f), col });
      }
    }
  }

  if (offenders.length) {
    fail(
      `CHECK 4 (API root collection must be users) failed:\n` +
        offenders.map((o) => `- ${o.file} — root collection "${o.col}"`).join("\n") +
        `\n\nFix: API must only start Firestore paths at collection("users"), then scope by uid.`
    );
  }

  console.log("✅ CHECK 4 passed: API starts Firestore paths only at collection('users').");
}

/**
 * CHECK 5 — Account deletion must be implemented end-to-end
 *
 * Rule:
 * - If the API exposes an account deletion route, then:
 *   (a) functions must include a Pub/Sub executor using onMessagePublished(), and
 *   (b) that executor must reference the canonical topic "account.delete.v1".
 *
 * This avoids brittle string matching in API code (API may use constants/env),
 * and prevents “route exists but no executor” regressions.
 */
function checkAccountDeleteExecutorExists() {
  const apiFile = path.join(ROOT, "services", "api", "src", "routes", "account.ts");
  const fnDir = path.join(ROOT, "services", "functions", "src");

  if (!fs.existsSync(apiFile) || !fs.existsSync(fnDir)) return;

  const apiText = readText(apiFile);

  const exposesDelete =
    /router\.post\s*\(\s*["'`][^"'`]*\/?account\/delete[^"'`]*["'`]/.test(apiText) ||
    /router\.post\s*\(\s*["'`][^"'`]*\/?delete[^"'`]*["'`]/.test(apiText);

  if (!exposesDelete) {
    console.log("ℹ️ CHECK 5 skipped: API does not expose an /account/delete route (no enforcement needed).");
    return;
  }

  const topic = "account.delete.v1";
  const files = walk(fnDir, { includeExts: [".ts"], ignoreDirs: ["__tests__", "dist", "lib"] });

  let hasExecutor = false;
  for (const f of files) {
    const text = readText(f);
    if (!/\bonMessagePublished\s*\(/.test(text)) continue;
    if (!text.includes(topic)) continue;
    hasExecutor = true;
    break;
  }

  if (!hasExecutor) {
    fail(
      `CHECK 5 (Account deletion executor) failed:\n` +
        `- services/api/src/routes/account.ts exposes an account deletion route, but no Pub/Sub executor was found for topic "${topic}".\n\n` +
        `Fix: add a Functions Gen2 onMessagePublished("${topic}") executor that performs deletion.`
    );
  }

  console.log("✅ CHECK 5 passed: Account deletion route has a Functions Pub/Sub executor.");
}

/**
 * CHECK 6 — Invariant documentation must be binding, not scaffolding
 *
 * Rule:
 * - docs/INVARIANTS_MAP.md must exist
 * - must not contain placeholder language (TODO, TBD, placeholder)
 * - must reference CHECK 1..CHECK 5 explicitly
 *
 * This prevents docs from drifting into non-binding fluff.
 */
function checkInvariantDocsAreBinding() {
  const docPath = path.join(ROOT, "docs", "INVARIANTS_MAP.md");

  if (!fs.existsSync(docPath)) {
    fail(
      `CHECK 6 (Invariant docs binding) failed:\n` +
        `- docs/INVARIANTS_MAP.md is missing\n\n` +
        `Fix: restore the invariant enforcement map.`
    );
  }

  const text = readText(docPath);

  const forbidden = /\b(TODO|TBD|placeholder)\b/i;
  if (forbidden.test(text)) {
    fail(
      `CHECK 6 (Invariant docs binding) failed:\n` +
        `- docs/INVARIANTS_MAP.md contains placeholder language (TODO/TBD/placeholder)\n\n` +
        `Fix: replace placeholders with concrete enforcement details.`
    );
  }

  const requiredChecks = ["CHECK 1", "CHECK 2", "CHECK 3", "CHECK 4", "CHECK 5"];
  const missing = requiredChecks.filter((c) => !text.includes(c));

  if (missing.length) {
    fail(
      `CHECK 6 (Invariant docs binding) failed:\n` +
        `- docs/INVARIANTS_MAP.md does not reference: ${missing.join(", ")}\n\n` +
        `Fix: explicitly link invariants to their enforcement checks.`
    );
  }

  console.log("✅ CHECK 6 passed: Invariant documentation is present, concrete, and enforcement-linked.");
}

/**
 * CHECK 7 — iOS Pods must not be committed
 *
 * Rule:
 * - In CI only, ios/Pods/ must not exist in the repo tree.
 *
 * Rationale:
 * - Locally, Pods may exist after pod install / expo prebuild (that's fine).
 * - In CI, Pods should never exist unless someone committed them.
 */
function checkIosPodsNotCommitted() {
  const isCI = String(process.env.CI ?? "").trim().toLowerCase() === "true";
  if (!isCI) {
    console.log("ℹ️ CHECK 7 skipped (not CI): local ios/Pods may exist after pod install / expo prebuild.");
    return;
  }

  const podsDir = path.join(ROOT, "ios", "Pods");
  if (fs.existsSync(podsDir)) {
    fail(
      `CHECK 7 (iOS Pods not committed) failed:\n` +
        `- ios/Pods exists in the CI checkout\n\n` +
        `Meaning:\n` +
        `- In real CI, this typically only happens if Pods were committed (or vendor-copied) into the repo.\n` +
        `- On a developer machine, you can reproduce CI by setting CI=true, but local Pods may exist.\n\n` +
        `Fix (if Pods are committed):\n` +
        `1) Ensure .gitignore includes "ios/Pods/"\n` +
        `2) Remove tracked Pods: git rm -r --cached ios/Pods && commit\n` +
        `3) Pods must be generated locally (pod install / expo prebuild), never committed\n\n` +
        `Sanity check:\n` +
        `- git ls-files ios/Pods | wc -l  (should be 0)`
    );
  }

  console.log("✅ CHECK 7 passed (CI): ios/Pods is not present (not committed).");
}


function main() {
  console.log("Running Oli constitutional invariant CI checks...\n");
  checkAdminHttpNotPublic();
  checkClientNoDerivedWrites();
  checkApiIdempotency();
  checkApiNoGlobalFirestoreRootCollections();
  checkAccountDeleteExecutorExists();
  checkInvariantDocsAreBinding();
  checkIosPodsNotCommitted();
  console.log("\n✅ All invariant checks passed.");
}

main();
