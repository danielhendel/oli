#!/usr/bin/env node
/* eslint-disable no-console */
import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";

const ROOT = process.cwd();

function fail(msg) {
  console.error(`\n❌ Invariant check failed:\n${msg}\n`);
  process.exit(1);
}

function readText(filePath) {
  return fs.readFileSync(filePath, "utf8");
}

function readJson(filePath) {
  try {
    return JSON.parse(readText(filePath));
  } catch (err) {
    const e = err instanceof Error ? err.message : String(err);
    fail(`Failed to parse JSON: ${filePath}\n${e}`);
  }
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

function exists(p) {
  return fs.existsSync(p);
}

/**
 * CHECK 1 — No public admin HTTP functions
 */
function checkAdminHttpNotPublic() {
  const base = path.join(ROOT, "services", "functions", "src");
  if (!exists(base)) return;

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
  const targets = [path.join(ROOT, "app"), path.join(ROOT, "lib")].filter(exists);
  if (!targets.length) return;

  const files = targets.flatMap((t) =>
    walk(t, { includeExts: [".ts", ".tsx"], ignoreDirs: ["__tests__", "dist", "lib"] }),
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
        `\n\nFix: clients must only read derived collections; all writes go through the backend ingestion API.`,
    );
  }

  console.log("✅ CHECK 2 passed: No client-side writes to derived truth collections detected.");
}

/**
 * CHECK 3 — Ingestion routes must enforce idempotency
 *
 * Exemption: invoker-only scheduled job routes (e.g. POST /integrations/withings/pull) are
 * system-initiated, use deterministic internal doc IDs (rawEvent doc id = idempotencyKey), are
 * not callable by clients, and therefore do not require Idempotency-Key header. Exempt list
 * must stay minimal; any new exempt file must be invoker-only and use deterministic internal ids.
 */
function checkApiIdempotency() {
  const routesDir = path.join(ROOT, "services", "api", "src", "routes");
  if (!exists(routesDir)) return;

  const IDEMPOTENCY_POST_EXEMPT_FILES = new Set(["withingsPull.ts", "withingsBackfill.ts"]);
  const EXEMPT_FILE_TO_MOUNT_PATH = new Map([
    ["withingsPull.ts", "/integrations/withings/pull"],
    ["withingsBackfill.ts", "/integrations/withings/backfill"],
  ]);
  for (const basename of IDEMPOTENCY_POST_EXEMPT_FILES) {
    const mountPath = EXEMPT_FILE_TO_MOUNT_PATH.get(basename);
    if (!mountPath || !mountPath.startsWith("/integrations/") || !mountPath.includes("withings")) {
      fail(
        `CHECK 3 (API idempotency): exempt file "${basename}" must have a mount path in EXEMPT_FILE_TO_MOUNT_PATH starting with /integrations/ and including "withings".`,
      );
    }
  }

  const files = walk(routesDir, { includeExts: [".ts"], ignoreDirs: ["__tests__", "dist", "lib"] });

  const offenders = [];

  for (const f of files) {
    if (IDEMPOTENCY_POST_EXEMPT_FILES.has(path.basename(f))) continue;

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
        `\n\nFix: ingestion POST routes must read Idempotency-Key and use deterministic write IDs (or equivalent request record).`,
    );
  }

  console.log("✅ CHECK 3 passed: API ingestion routes appear to enforce Idempotency-Key.");
}

/**
 * CHECK 4 — Cloud Run API must not start Firestore paths outside /users/{uid}/...
 */
function checkApiNoGlobalFirestoreRootCollections() {
  const base = path.join(ROOT, "services", "api", "src");
  if (!exists(base)) return;

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
        // users = per-uid data; system = deterministic registry (e.g. withings connected) only in db.ts
        if (col !== "users" && col !== "system") offenders.push({ file: rel(f), col });
        if (col === "system" && !f.includes("db.ts")) offenders.push({ file: rel(f), col });
      }
    }
  }

  if (offenders.length) {
    fail(
      `CHECK 4 (API root collection must be users or system in db.ts only) failed:\n` +
        offenders.map((o) => `- ${o.file} — root collection "${o.col}"`).join("\n") +
        `\n\nFix: API must only start Firestore paths at collection("users"), or collection("system") in db.ts for registry only.`,
    );
  }

  console.log("✅ CHECK 4 passed: API starts Firestore paths only at collection('users').");
}

/**
 * CHECK 5 — Account deletion must be implemented end-to-end
 */
function checkAccountDeleteExecutorExists() {
  const apiFile = path.join(ROOT, "services", "api", "src", "routes", "account.ts");
  const fnDir = path.join(ROOT, "services", "functions", "src");

  if (!exists(apiFile) || !exists(fnDir)) return;

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
        `Fix: add a Functions Gen2 onMessagePublished("${topic}") executor that performs deletion.`,
    );
  }

  console.log("✅ CHECK 5 passed: Account deletion route has a Functions Pub/Sub executor.");
}

/**
 * CHECK 6 — Invariants map is binding AND cannot drift (no orphan invariants, no orphan checks)
 *
 * Enforces:
 *  - docs/90_audits/INVARIANT_ENFORCEMENT_MAP.md must exist
 *  - no TODO/TBD/placeholder language
 *  - every CHECK implemented in this script appears in the map
 *  - every CHECK referenced in the map exists in this script
 *  - every invariant row has enforcement + verification fields
 *  - every "Files:" reference in the map must exist on disk (enforcement is real)
 */
function checkInvariantMapNoDriftAndNoOrphans(expectedCheckIds) {
  const docPath = path.join(ROOT, "docs", "90_audits", "INVARIANT_ENFORCEMENT_MAP.md");
  if (!exists(docPath)) {
    fail(
      `CHECK 6 (Invariant map drift) failed:\n` +
        `- docs/90_audits/INVARIANT_ENFORCEMENT_MAP.md is missing\n\n` +
        `Fix: restore the invariant enforcement map.`,
    );
  }

  // --- Option A Monorepo invariant: duplicate contracts folder must never exist ---
  const dupContractsDir = path.join(ROOT, "services", "api", "lib", "contracts");
  if (exists(dupContractsDir)) {
    fail(
      `CHECK 6 (Invariant map drift) failed:\n` +
        `- Duplicate contracts folder detected at services/api/lib/contracts\n\n` +
        `Fix:\n` +
        `- Remove services/api/lib/contracts entirely.\n` +
        `- services/api must depend on @oli/contracts via npm workspaces only (single source of truth at lib/contracts).`,
    );
  }

  const text = readText(docPath);

  const forbidden = /\b(TODO|TBD|placeholder)\b/i;
  if (forbidden.test(text)) {
    fail(
      `CHECK 6 (Invariant map drift) failed:\n` +
        `- docs/90_audits/INVARIANT_ENFORCEMENT_MAP.md contains placeholder language (TODO/TBD/placeholder)\n\n` +
        `Fix: replace placeholders with concrete enforcement details.`,
    );
  }

  // Extract CHECK ids mentioned anywhere in the doc (authoritative list).
  const mentioned = new Set();
  for (const m of text.matchAll(/\bCHECK\s+(\d+)\b/g)) {
    mentioned.add(Number(m[1]));
  }

  const expected = new Set(expectedCheckIds);

  const missingInDoc = [...expected].filter((id) => !mentioned.has(id)).sort((a, b) => a - b);
  const extraInDoc = [...mentioned].filter((id) => !expected.has(id)).sort((a, b) => a - b);

  if (missingInDoc.length || extraInDoc.length) {
    const lines = [
      `CHECK 6 (Invariant map drift) failed:`,
      ``,
      `Invariant map and enforcement script are out of sync.`,
      ``,
      ...(missingInDoc.length
        ? [
            `Missing in docs/90_audits/INVARIANT_ENFORCEMENT_MAP.md (implemented in code but not mapped):`,
            ...missingInDoc.map((id) => `- CHECK ${id}`),
            ``,
          ]
        : []),
      ...(extraInDoc.length
        ? [
            `Missing in scripts/ci/check-invariants.mjs (mapped in docs but not implemented):`,
            ...extraInDoc.map((id) => `- CHECK ${id}`),
            ``,
          ]
        : []),
      `Fix: update docs/90_audits/INVARIANT_ENFORCEMENT_MAP.md and/or scripts/ci/check-invariants.mjs so they match exactly.`,
    ];
    fail(lines.join("\n"));
  }

  // Parse the invariant index table rows: ensure no invariant exists without enforcement + verification.
  const tableRowRe = /^\|\s*(I-\d+)\s*\|\s*([^|]+)\|\s*([^|]+)\|\s*([^|]+)\|\s*([^|]+)\|\s*$/gm;
  const rows = [];
  for (const m of text.matchAll(tableRowRe)) {
    rows.push({
      id: String(m[1]).trim(),
      invariant: String(m[2]).trim(),
      enforcedWhere: String(m[3]).trim(),
      verifiedBy: String(m[4]).trim(),
      breakage: String(m[5]).trim(),
    });
  }

  if (!rows.length) {
    fail(
      `CHECK 6 (Invariant map drift) failed:\n` +
        `- Could not parse any invariant rows from the Invariant Index table.\n\n` +
        `Fix: ensure the Invariant Index is a valid markdown table with rows starting "| I-.." `,
    );
  }

  const orphanInvariants = [];
  for (const r of rows) {
    if (!r.enforcedWhere || r.enforcedWhere === "-" || r.enforcedWhere.toLowerCase() === "tbd") {
      orphanInvariants.push(`${r.id} — missing "Enforced Where"`);
    }
    if (!r.verifiedBy || r.verifiedBy === "-" || r.verifiedBy.toLowerCase() === "tbd") {
      orphanInvariants.push(`${r.id} — missing "Verified By"`);
    }
  }
  if (orphanInvariants.length) {
    fail(
      `CHECK 6 (No orphan invariants) failed:\n` +
        orphanInvariants.map((s) => `- ${s}`).join("\n") +
        `\n\nFix: every invariant must declare an enforcement mechanism and a verification gate.`,
    );
  }

  // Verify that any "CHECK N" referenced in the table is a real implemented check.
  const tableCheckRefs = new Set();
  for (const r of rows) {
    for (const m of r.verifiedBy.matchAll(/\bCHECK\s+(\d+)\b/g)) {
      tableCheckRefs.add(Number(m[1]));
    }
  }
  const missingChecksFromTable = [...tableCheckRefs]
    .filter((id) => !expected.has(id))
    .sort((a, b) => a - b);
  if (missingChecksFromTable.length) {
    fail(
      `CHECK 6 (Invariant table references missing checks) failed:\n` +
        missingChecksFromTable.map((id) => `- CHECK ${id}`).join("\n") +
        `\n\nFix: either implement the missing checks in scripts/ci/check-invariants.mjs or remove them from the map.`,
    );
  }

  // Enforcement must be real: verify that any backticked repo path under "Files:" exists.
  // We intentionally validate only relative paths that look like repo files.
  const filePathRe = /`([a-zA-Z0-9_.-]+(?:\/[a-zA-Z0-9_.-]+)+)`/g;
  const fileRefs = new Set();

  for (const m of text.matchAll(filePathRe)) {
    const p = String(m[1]).trim();

    // Ignore IAM roles and principals (not repo files)
    if (p.startsWith("roles/")) continue;
    if (p.startsWith("serviceAccount:")) continue;
    if (p.startsWith("user:")) continue;
    if (p.startsWith("group:")) continue;
    if (p.startsWith("domain:")) continue;
    if (p === "allUsers" || p === "allAuthenticatedUsers") continue;

    // Ignore CLI snippets and URLs
    if (p.startsWith("gcloud ")) continue;
    if (p.includes("://")) continue;

    // Only treat values that look like real repo files as enforceable paths.
    // Require a file extension (.ts, .json, .yml, .tf, .md, etc.)
    if (!/\.[a-z0-9]{1,8}$/i.test(p)) continue;

    fileRefs.add(p);
  }

  const missingFiles = [];
  for (const p of [...fileRefs]) {
    const abs = path.join(ROOT, p);
    if (!exists(abs)) missingFiles.push(p);
  }

  if (missingFiles.length) {
    fail(
      `CHECK 6 (Invariant map references missing files) failed:\n` +
        missingFiles.map((p) => `- ${p}`).join("\n") +
        `\n\nFix: either restore the missing files or update docs/90_audits/INVARIANT_ENFORCEMENT_MAP.md so it only references real enforcement locations.`,
    );
  }

  console.log(
    "✅ CHECK 6 passed: INVARIANTS_MAP is binding and perfectly aligned with enforcement (no drift, no orphan invariants).",
  );
}

/**
 * CHECK 7 — iOS Pods must not be committed
 */
function checkIosPodsNotCommitted() {
  const isCI = String(process.env.CI ?? "").trim().toLowerCase() === "true";
  if (!isCI) {
    console.log("ℹ️ CHECK 7 skipped (not CI): local ios/Pods may exist after pod install / expo prebuild.");
    return;
  }

  const podsDir = path.join(ROOT, "ios", "Pods");
  if (exists(podsDir)) {
    fail(
      `CHECK 7 (iOS Pods not committed) failed:\n` +
        `- ios/Pods exists in the CI checkout\n\n` +
        `Fix:\n` +
        `1) Ensure .gitignore includes "ios/Pods/"\n` +
        `2) Remove tracked Pods: git rm -r --cached ios/Pods && commit\n` +
        `3) Pods must be generated locally (pod install / expo prebuild), never committed`,
    );
  }

  console.log("✅ CHECK 7 passed (CI): ios/Pods is not present (not committed).");
}

/**
 * CHECK 8 — patch-package integrity (version drift tripwire)
 */
function parsePatchFilename(fileName) {
  const base = fileName.endsWith(".patch") ? fileName.slice(0, -".patch".length) : fileName;
  const parts = base.split("+").filter(Boolean);
  if (parts.length < 2) return null;

  const version = parts[parts.length - 1];
  if (!version || !/^\d+\.\d+\.\d+/.test(version)) return null;

  let pkg;
  if (parts[0].startsWith("@")) {
    if (parts.length < 3) return null;
    const scope = parts[0];
    const name = parts[1];
    pkg = `${scope}/${name}`;
  } else {
    pkg = parts[0];
  }

  return { pkg, version };
}

function readPackageLock() {
  const lockPath = path.join(ROOT, "package-lock.json");
  if (!exists(lockPath)) return null;
  try {
    return JSON.parse(readText(lockPath));
  } catch {
    return null;
  }
}

function findInstalledVersionInLock(lockJson, pkg) {
  if (!lockJson) return null;

  if (lockJson.packages && typeof lockJson.packages === "object") {
    const key = `node_modules/${pkg}`;
    const rec = lockJson.packages[key];
    if (rec && typeof rec.version === "string") return rec.version;
  }

  const deps = lockJson.dependencies;
  if (deps && typeof deps === "object") {
    const rec = deps[pkg];
    if (rec && typeof rec.version === "string") return rec.version;
  }

  return null;
}

function checkPatchPackageIntegrity() {
  const patchesDir = path.join(ROOT, "patches");
  if (!exists(patchesDir)) {
    console.log("ℹ️ CHECK 8 skipped: no patches/ directory (no patch-package integrity enforcement needed).");
    return;
  }

  const patchFiles = fs
    .readdirSync(patchesDir)
    .filter((f) => f.endsWith(".patch"))
    .sort();

  if (!patchFiles.length) {
    console.log("ℹ️ CHECK 8 skipped: patches/ exists but contains no .patch files.");
    return;
  }

  const lock = readPackageLock();
  if (!lock) {
    fail(
      `CHECK 8 (patch-package integrity) failed:\n` +
        `- patches/ contains patch files, but package-lock.json is missing or unreadable.\n\n` +
        `Fix: commit package-lock.json so patch integrity can be validated.`,
    );
  }

  const offenders = [];

  for (const f of patchFiles) {
    const parsed = parsePatchFilename(f);
    if (!parsed) {
      offenders.push(`- patches/${f} — cannot parse {package, version} from filename`);
      continue;
    }

    const patchPath = path.join(patchesDir, f);
    const text = readText(patchPath);

    if (!/diff --git a\/node_modules\//.test(text)) {
      offenders.push(`- patches/${f} — does not contain a diff against a/node_modules/...`);
      continue;
    }

    const installed = findInstalledVersionInLock(lock, parsed.pkg);
    if (!installed) {
      offenders.push(`- patches/${f} — package "${parsed.pkg}" not found in package-lock.json`);
      continue;
    }

    if (installed !== parsed.version) {
      offenders.push(
        `- patches/${f} — version mismatch for "${parsed.pkg}": patch=${parsed.version}, lock=${installed}`,
      );
      continue;
    }
  }

  if (offenders.length) {
    fail(
      `CHECK 8 (patch-package integrity) failed:\n` +
        offenders.join("\n") +
        `\n\nFix options:\n` +
        `1) Rename patch version to match lock, OR\n` +
        `2) Regenerate patch after upgrading deps, OR\n` +
        `3) Remove obsolete patch.`,
    );
  }

  console.log("✅ CHECK 8 passed: patch-package patches match package-lock.json versions and appear valid.");
}

/**
 * CHECK 9 — API route files must not directly use firebase-admin Firestore
 */
function checkApiRoutesNoDirectAdminFirestore() {
  const routesDir = path.join(ROOT, "services", "api", "src", "routes");
  if (!exists(routesDir)) return;

  const files = walk(routesDir, { includeExts: [".ts"], ignoreDirs: ["__tests__", "dist", "lib"] });

  const offenders = [];

  for (const f of files) {
    const text = readText(f);

    const importsAdminFirestore =
      /from\s+["']firebase-admin\/firestore["']/.test(text) ||
      /require\s*\(\s*["']firebase-admin\/firestore["']\s*\)/.test(text);

    const callsGetFirestore = /\bgetFirestore\s*\(/.test(text);

    if (importsAdminFirestore || callsGetFirestore) {
      const reasons = [];
      if (importsAdminFirestore) reasons.push(`imports "firebase-admin/firestore"`);
      if (callsGetFirestore) reasons.push("calls getFirestore()");
      offenders.push(`- ${rel(f)} — ${reasons.join(" and ")}`);
    }
  }

  if (offenders.length) {
    fail(
      `CHECK 9 (API route Firestore boundary) failed:\n` +
        offenders.join("\n") +
        `\n\nFix:\n` +
        `- Routes must import Firestore access ONLY via a single adapter module (e.g. services/api/src/db.ts or services/api/src/firebaseAdmin.ts).\n` +
        `- That adapter is where we enforce scoping/instrumentation.\n`,
    );
  }

  console.log("✅ CHECK 9 passed: API route files do not directly import/call firebase-admin Firestore.");
}

/**
 * CHECK 10 — IAM snapshot files must exist (CI has no GCP auth; snapshots are the enforcement input)
 *
 * We enforce IAM invariants by parsing committed JSON snapshots under docs/_snapshots/iam/.
 */
function requiredIamSnapshots() {
  return [
    {
      id: "projectIam",
      file: path.join(ROOT, "docs", "_snapshots", "iam", "project-iam-policy.snapshot.json"),
      description: "Project IAM policy snapshot (gcloud projects get-iam-policy ... --format=json)",
    },
    {
      id: "runServices",
      file: path.join(ROOT, "docs", "_snapshots", "iam", "run-services-us-central1.snapshot.json"),
      description:
        "Cloud Run services list snapshot (gcloud run services list --region=us-central1 --format=json)",
    },
    {
      id: "functionsV2",
      file: path.join(ROOT, "docs", "_snapshots", "iam", "functions-v2-us-central1.snapshot.json"),
      description:
        "Cloud Functions v2 list snapshot (gcloud functions list --v2 --regions=us-central1 --format=json)",
    },
    {
      id: "functionsV1",
      file: path.join(ROOT, "docs", "_snapshots", "iam", "functions-v1-us-central1.snapshot.json"),
      description:
        "Cloud Functions v1 list snapshot (gcloud functions list --regions=us-central1 --format=json)",
    },
  ];
}

function checkIamSnapshotsExist() {
  const snaps = requiredIamSnapshots();
  const missing = snaps.filter((s) => !exists(s.file));

  if (missing.length) {
    const help = [
      "CHECK 10 (IAM snapshots present) failed:",
      "",
      "Missing required IAM snapshot files under docs/_snapshots/iam/:",
      ...missing.map((m) => `- ${rel(m.file)} — ${m.description}`),
      "",
      "Fix (generate + commit snapshots):",
      "",
      "  mkdir -p docs/_snapshots/iam",
      "  gcloud projects get-iam-policy oli-staging-fdbba --format=json > docs/_snapshots/iam/project-iam-policy.snapshot.json",
      "  gcloud run services list --project=oli-staging-fdbba --region=us-central1 --format=json > docs/_snapshots/iam/run-services-us-central1.snapshot.json",
      "  gcloud functions list --v2 --project=oli-staging-fdbba --regions=us-central1 --format=json > docs/_snapshots/iam/functions-v2-us-central1.snapshot.json",
      "  gcloud functions list --project=oli-staging-fdbba --regions=us-central1 --format=json > docs/_snapshots/iam/functions-v1-us-central1.snapshot.json",
      "",
      "Then commit the docs/_snapshots/iam/*.snapshot.json files.",
    ].join("\n");

    fail(help);
  }

  console.log("✅ CHECK 10 passed: Required IAM snapshot JSON files are present under docs/_snapshots/iam/.");
}

/**
 * CHECK 11 — roles/editor is forbidden in project IAM
 */
function checkIamNoEditorRole() {
  const policyPath = path.join(ROOT, "docs", "_snapshots", "iam", "project-iam-policy.snapshot.json");
  const policy = readJson(policyPath);

  const bindings = Array.isArray(policy.bindings) ? policy.bindings : [];
  const offenders = bindings
    .filter((b) => b && b.role === "roles/editor")
    .map((b) => ({
      role: b.role,
      members: Array.isArray(b.members) ? b.members : [],
    }))
    .filter((b) => b.members.length > 0);

  if (offenders.length) {
    const msg =
      offenders
        .map((o) => `- roles/editor members:\n  ${o.members.map((m) => `- ${m}`).join("\n  ")}`)
        .join("\n") + "\n\nFix: remove roles/editor bindings from the project IAM policy.";
    fail(`CHECK 11 (IAM: roles/editor forbidden) failed:\n${msg}`);
  }

  console.log("✅ CHECK 11 passed: Project IAM contains no roles/editor bindings.");
}

/**
 * CHECK 12 — Default service accounts must have zero bindings (no privilege creep)
 */
function checkIamNoDefaultServiceAccountBindings() {
  const policyPath = path.join(ROOT, "docs", "_snapshots", "iam", "project-iam-policy.snapshot.json");
  const policy = readJson(policyPath);

  const bindings = Array.isArray(policy.bindings) ? policy.bindings : [];

  const isComputeDefault = (m) =>
    typeof m === "string" && /-compute@developer\.gserviceaccount\.com$/.test(m);
  const isAppspotDefault = (m) => typeof m === "string" && /@appspot\.gserviceaccount\.com$/.test(m);

  const offenders = [];

  for (const b of bindings) {
    const role = b?.role;
    const members = Array.isArray(b?.members) ? b.members : [];
    for (const m of members) {
      if (isComputeDefault(m) || isAppspotDefault(m)) {
        offenders.push({ role, member: m });
      }
    }
  }

  if (offenders.length) {
    const msg =
      offenders.map((o) => `- ${o.member} has ${o.role}`).join("\n") +
      "\n\nFix: default service accounts must not have any project IAM bindings.";
    fail(`CHECK 12 (IAM: default service accounts must have zero bindings) failed:\n${msg}`);
  }

  console.log("✅ CHECK 12 passed: No default service account members appear in project IAM bindings.");
}

/**
 * CHECK 13 — Runtime identities must match allowlist (Cloud Run + Functions)
 *
 * Enforced via committed snapshots (CI has no GCP auth).
 */
function checkRuntimeServiceAccountsAllowlist() {
  const EXPECTED = {
    projectId: "oli-staging-fdbba",
    region: "us-central1",
    functionsRuntimeSa: "oli-functions-runtime@oli-staging-fdbba.iam.gserviceaccount.com",
    apiRuntimeSa: "oli-api-runtime@oli-staging-fdbba.iam.gserviceaccount.com",
    cloudRunApiServiceName: "oli-api",
  };

  // Cloud Run services list snapshot
  const runPath = path.join(ROOT, "docs", "_snapshots", "iam", "run-services-us-central1.snapshot.json");
  const runServices = readJson(runPath);
  const runArr = Array.isArray(runServices) ? runServices : [];
  const runOffenders = [];

  for (const svc of runArr) {
    const name = svc?.metadata?.name;
    const sa = svc?.spec?.template?.spec?.serviceAccountName;

    if (name === EXPECTED.cloudRunApiServiceName) {
      if (sa !== EXPECTED.apiRuntimeSa) {
        runOffenders.push(
          `- Cloud Run ${name}: serviceAccountName=${String(sa)} (expected ${EXPECTED.apiRuntimeSa})`,
        );
      }
    }
  }

  if (!runArr.some((s) => s?.metadata?.name === EXPECTED.cloudRunApiServiceName)) {
    runOffenders.push(`- Cloud Run service "${EXPECTED.cloudRunApiServiceName}" not found in snapshot`);
  }

  // Cloud Functions v2 list snapshot
  const fn2Path = path.join(ROOT, "docs", "_snapshots", "iam", "functions-v2-us-central1.snapshot.json");
  const fn2 = readJson(fn2Path);
  const fn2Arr = Array.isArray(fn2) ? fn2 : [];
  const fn2Offenders = [];

  for (const f of fn2Arr) {
    const name = f?.name ? String(f.name).split("/").pop() : undefined;
    const sa = f?.serviceConfig?.serviceAccountEmail;
    if (!name) continue;
    if (sa !== EXPECTED.functionsRuntimeSa) {
      fn2Offenders.push(
        `- Functions v2 ${name}: serviceAccountEmail=${String(sa)} (expected ${EXPECTED.functionsRuntimeSa})`,
      );
    }
  }

  if (!fn2Arr.length) {
    fn2Offenders.push("- Functions v2 snapshot is empty (unexpected)");
  }

  // Cloud Functions v1 list snapshot
  const fn1Path = path.join(ROOT, "docs", "_snapshots", "iam", "functions-v1-us-central1.snapshot.json");
  const fn1 = readJson(fn1Path);
  const fn1Arr = Array.isArray(fn1) ? fn1 : [];
  const fn1Offenders = [];

  for (const f of fn1Arr) {
    const name = f?.name;
    const sa = f?.serviceAccountEmail;
    if (!name) continue;

    if (sa && sa !== EXPECTED.functionsRuntimeSa) {
      fn1Offenders.push(
        `- Functions v1 ${name}: serviceAccountEmail=${String(sa)} (expected ${EXPECTED.functionsRuntimeSa})`,
      );
    }
  }

  const offenders = [...runOffenders, ...fn2Offenders, ...fn1Offenders];
  if (offenders.length) {
    fail(
      `CHECK 13 (Runtime service accounts allowlist) failed:\n` +
        offenders.join("\n") +
        `\n\nFix: redeploy workloads to use dedicated service accounts and refresh docs/_snapshots/iam snapshots.`,
    );
  }

  console.log("✅ CHECK 13 passed: Cloud Run + Functions runtime identities match the allowlist.");
}

/**
 * CHECK 14 — Cloud Run must not be publicly invokable AND must be invokable by API Gateway
 */
function checkCloudRunInvokerNotPublicAndGatewayOnly() {
  const candidates = [
    path.join(ROOT, "cloudrun-oli-api-iam.json"),
    path.join(ROOT, "docs", "_snapshots", "iam", "cloudrun-oli-api-iam.snapshot.json"),
  ];

  const found = candidates.find((p) => exists(p));
  if (!found) {
    fail(
      `CHECK 14 (Cloud Run invoker policy snapshot present) failed:\n` +
        `- Missing Cloud Run IAM policy snapshot for oli-api.\n\n` +
        `Expected one of:\n` +
        candidates.map((p) => `- ${rel(p)}`).join("\n") +
        `\n\nFix (generate + commit snapshot):\n` +
        `  gcloud run services get-iam-policy oli-api --project=oli-staging-fdbba --region=us-central1 --format=json > cloudrun-oli-api-iam.json`,
    );
  }

  const policy = readJson(found);
  const bindings = Array.isArray(policy.bindings) ? policy.bindings : [];

  const invokerBindings = bindings.filter((b) => b?.role === "roles/run.invoker");
  const invokerMembers = invokerBindings.flatMap((b) => (Array.isArray(b?.members) ? b.members : []));

  const publicMembers = invokerMembers.filter((m) => m === "allUsers" || m === "allAuthenticatedUsers");
  if (publicMembers.length) {
    fail(
      `CHECK 14 (Cloud Run not public) failed:\n` +
        `- ${rel(found)} grants roles/run.invoker to:\n` +
        publicMembers.map((m) => `  - ${m}`).join("\n") +
        `\n\nFix: remove allUsers/allAuthenticatedUsers from Cloud Run invoker bindings and re-snapshot.`,
    );
  }

  const hasGatewaySa = invokerMembers.some((m) => /gcp-sa-apigateway\.iam\.gserviceaccount\.com$/.test(String(m)));
  if (!hasGatewaySa) {
    fail(
      `CHECK 14 (Gateway must be invoker) failed:\n` +
        `- ${rel(found)} does not include the API Gateway service account as a roles/run.invoker member.\n\n` +
        `Fix: grant roles/run.invoker on oli-api to the API Gateway managed service account and re-snapshot.`,
    );
  }

  console.log("✅ CHECK 14 passed: Cloud Run is not public and API Gateway is an authorized invoker.");
}

/**
 * CHECK 15 — CanonicalEventKind must be a subset of ingestion rawEventKindSchema.
 *
 * Phase 1 requirement:
 * - RawEvents may include "memory-only" kinds that do NOT normalize into CanonicalEvents (e.g. upload.file).
 * - CanonicalEventKind must remain the strict set of normalized health facts.
 *
 * Enforcement:
 * - CanonicalEventKind ⊆ rawEventKindSchema
 * - Any extra raw kinds must be explicitly allowlisted as memory-only.
 * - Any new raw kind not allowlisted FAILS (prevents silent drift).
 */
function checkCanonicalKindsNoDrift() {
  const rawEventPath = path.join(ROOT, "lib", "contracts", "rawEvent.ts");
  const healthPath = path.join(ROOT, "services", "functions", "src", "types", "health.ts");
  if (!exists(rawEventPath) || !exists(healthPath)) return;

  // Memory-only RawEvent kinds are explicitly allowlisted here.
  // If you add another raw-only kind, it MUST be added to this list and documented.
  // Phase 2: "incomplete" = "something happened, details later" — no canonical normalization.
  const MEMORY_ONLY_RAW_EVENT_KINDS = ["file", "incomplete"];

  const rawText = readText(rawEventPath);
  const healthText = readText(healthPath);

  const rawEnumMatch = rawText.match(/rawEventKindSchema\s*=\s*z\.enum\s*\(\s*\[([\s\S]*?)\]\s*\)/m);
  if (!rawEnumMatch) {
    fail(
      `CHECK 15 (Canonical kind drift) failed:\n` +
        `- Could not parse rawEventKindSchema enum from ${rel(rawEventPath)}\n\n` +
        `Fix: ensure rawEventKindSchema is declared as z.enum([...]) in lib/contracts/rawEvent.ts.`,
    );
  }

  const rawEnumBody = String(rawEnumMatch[1]);
  const rawKinds = [...rawEnumBody.matchAll(/["']([^"']+)["']/g)].map((m) => String(m[1]));

  const canonicalMatch = healthText.match(/export\s+type\s+CanonicalEventKind\s*=\s*([\s\S]*?);/m);
  if (!canonicalMatch) {
    fail(
      `CHECK 15 (Canonical kind drift) failed:\n` +
        `- Could not parse CanonicalEventKind union from ${rel(healthPath)}\n\n` +
        `Fix: ensure CanonicalEventKind is declared as a string-literal union in services/functions/src/types/health.ts.`,
    );
  }

  const canonicalBody = String(canonicalMatch[1]);
  const canonicalKinds = [...canonicalBody.matchAll(/["']([^"']+)["']/g)].map((m) => String(m[1]));

  const rawSet = new Set(rawKinds);
  const canonicalSet = new Set(canonicalKinds);
  const memoryOnlySet = new Set(MEMORY_ONLY_RAW_EVENT_KINDS);

  // Canonical must be fully included in raw (no backend-only canonical kinds)
  const missingInRaw = [...canonicalSet].filter((k) => !rawSet.has(k)).sort();

  // Raw may include extras, but ONLY if allowlisted as memory-only
  const rawExtras = [...rawSet].filter((k) => !canonicalSet.has(k)).sort();
  const rawExtrasNotAllowlisted = rawExtras.filter((k) => !memoryOnlySet.has(k)).sort();

  // Allowlist must not contain unknown values (guard against typos)
  const allowlistNotInRaw = [...memoryOnlySet].filter((k) => !rawSet.has(k)).sort();

  if (missingInRaw.length || rawExtrasNotAllowlisted.length || allowlistNotInRaw.length) {
    const lines = [
      `CHECK 15 (Canonical kind drift) failed:`,
      ``,
      `Rules:`,
      `- CanonicalEventKind must be a subset of rawEventKindSchema`,
      `- rawEventKindSchema may contain ONLY allowlisted memory-only kinds beyond canonical`,
      ``,
      missingInRaw.length
        ? `Canonical kinds missing from rawEventKindSchema: ${missingInRaw.join(", ")}`
        : null,
      rawExtrasNotAllowlisted.length
        ? `Raw kinds present but NOT allowlisted as memory-only: ${rawExtrasNotAllowlisted.join(", ")}`
        : null,
      allowlistNotInRaw.length
        ? `Allowlisted memory-only kinds not present in rawEventKindSchema (typo/drift): ${allowlistNotInRaw.join(", ")}`
        : null,
      ``,
      `Files:`,
      `- ${rel(rawEventPath)}`,
      `- ${rel(healthPath)}`,
      ``,
      `Fix:`,
      `- If you added a new raw-only kind, add it to MEMORY_ONLY_RAW_EVENT_KINDS in scripts/ci/check-invariants.mjs`,
      `- If you added a new canonical kind, it must also exist in rawEventKindSchema`,
    ].filter(Boolean);

    fail(lines.join("\n"));
  }

  console.log(
    "✅ CHECK 15 passed: CanonicalEventKind ⊆ rawEventKindSchema; raw-only kinds are explicitly allowlisted (no drift).",
  );
}

/**
 * CHECK 16 — Phase 1 scope contract must exist and be non-trivial
 */
function checkPhase1ScopeDoc() {
  const p = path.join(ROOT, "docs", "00_truth", "phase1", "PHASE_1_SCOPE.md");
  if (!exists(p)) {
    fail(
      `CHECK 16 (Phase 1 scope contract) failed:\n` +
        `- Missing required file: docs/00_truth/phase1/PHASE_1_SCOPE.md\n\n` +
        `Fix: add docs/00_truth/phase1/PHASE_1_SCOPE.md (binding Phase 1 scope contract).`,
    );
  }

  const text = readText(p).trim();

  if (text.length < 400) {
    fail(
      `CHECK 16 (Phase 1 scope contract) failed:\n` +
        `- docs/00_truth/phase1/PHASE_1_SCOPE.md is too small (${text.length} chars). It must be non-trivial and binding.\n\n` +
        `Fix: expand Phase 1 scope with required capabilities and invariants.`,
    );
  }

  const hasPlaceholders = /\b(TODO|TBD|PLACEHOLDER)\b/i.test(text);
  if (hasPlaceholders) {
    fail(
      `CHECK 16 (Phase 1 scope contract) failed:\n` +
        `- docs/00_truth/phase1/PHASE_1_SCOPE.md contains placeholder language (TODO/TBD/PLACEHOLDER).\n\n` +
        `Fix: replace placeholders with binding requirements.`,
    );
  }

  console.log("✅ CHECK 16 passed: Phase 1 scope contract exists and is non-trivial.");
}

/**
 * CHECK 17 — Cloud Run API must not write Canonical/Derived directly (RawEvents-first)
 */
function checkApiRawEventsFirstNoDerivedTargets() {
  const base = path.join(ROOT, "services", "api", "src");
  if (!exists(base)) return;

  const files = walk(base, {
    includeExts: [".ts"],
    ignoreDirs: ["__tests__", "dist", "lib"],
  });

  const forbidden = [
    /\bcollection\s*\(\s*["']events["']\s*\)/,
    /\bcollection\s*\(\s*["']dailyFacts["']\s*\)/,
    /\bcollection\s*\(\s*["']insights["']\s*\)/,
    /\bcollection\s*\(\s*["']intelligenceContext["']\s*\)/,
  ];

  const offenders = [];

  for (const f of files) {
    const text = readText(f);
    for (const rx of forbidden) {
      if (rx.test(text)) {
        offenders.push(rel(f));
        break;
      }
    }
  }

  if (offenders.length) {
    fail(
      `CHECK 17 (API RawEvents-first) failed:\n` +
        offenders.map((p) => `- ${p}`).join("\n") +
        `\n\nFix: API must not write/read Canonical/Derived collections directly. All ingestion must land as RawEvents; derived truth is backend compute only.`,
    );
  }

  console.log("✅ CHECK 17 passed: API does not target derived/canonical collections directly.");
}

/**
 * CHECK 18 — Canonical events must be written immutably (no overwrite)
 *
 * Enforces:
 * - Normalization must not call .set(canonical) directly for /users/{uid}/events/{id}
 * - Must use immutable writer (create-only OR identical-on-replay)
 */
function checkCanonicalWriteIsImmutable() {
  const f = path.join(ROOT, "services", "functions", "src", "normalization", "onRawEventCreated.ts");
  if (!exists(f)) return;

  const text = readText(f);

  const usesImmutableWriter = /writeCanonicalEventImmutable/.test(text);

  // detect patterns like: .collection("events").doc(...).set(canonical)
  const hasDirectSetCanonical =
    /\.collection\(\s*["']events["']\s*\)[\s\S]*?\.set\s*\(\s*canonical\s*\)/m.test(text);

  if (!usesImmutableWriter || hasDirectSetCanonical) {
    fail(
      `CHECK 18 (Canonical immutability) failed:\n` +
        `- ${rel(f)} must write canonical events immutably (create-only OR identical-on-replay)\n\n` +
        `Fix:\n` +
        `- Use writeCanonicalEventImmutable(...)\n` +
        `- Do not call .set(canonical) directly for /users/{uid}/events/{id}\n`,
    );
  }

  console.log("✅ CHECK 18 passed: Canonical events are written immutably (no overwrite).");
}

/**
 * CHECK 19 — Derived truth writers must emit Derived Ledger runs (append-only historical truth)
 *
 * Enforces:
 * - Any function that writes dailyFacts / insights / intelligenceContext must call writeDerivedLedgerRun(...)
 */
function checkDerivedWritersEmitLedgerRuns() {
  const targets = [
    "services/functions/src/realtime/onCanonicalEventCreated.ts",
    "services/functions/src/dailyFacts/onDailyFactsRecomputeScheduled.ts",
    "services/functions/src/insights/onInsightsRecomputeScheduled.ts",
    "services/functions/src/intelligence/onDailyIntelligenceContextRecomputeScheduled.ts",
    "services/functions/src/pipeline/recomputeForDay.ts",
  ];

  const missing = [];
  for (const p of targets) {
    const abs = path.join(ROOT, p);
    if (!exists(abs)) continue;
    const text = readText(abs);

    const writesDerived =
      /collection\(\s*["']dailyFacts["']\s*\)/.test(text) ||
      /collection\(\s*["']insights["']\s*\)/.test(text) ||
      /collection\(\s*["']intelligenceContext["']\s*\)/.test(text);

    if (!writesDerived) continue;

    const hasLedgerCall = /\bwriteDerivedLedgerRun\s*\(/.test(text);
    if (!hasLedgerCall) missing.push(p);
  }

  if (missing.length) {
    fail(
      `CHECK 19 (Derived Ledger emission) failed:\n` +
        missing.map((p) => `- ${p}`).join("\n") +
        `\n\nFix: any derived writer must call writeDerivedLedgerRun(...) so historical truth is replayable.`,
    );
  }

  console.log("✅ CHECK 19 passed: Derived truth writers emit Derived Ledger runs.");
}

/**
 * CHECK 20 — Readiness vocabulary is canonical (Phase 1 Lock #3)
 *
 * Fails if non-canonical readiness strings appear in app/lib/components.
 * Canonical: missing | partial | ready | error
 * Disallowed: loading, empty, invalid, not-ready, unknown, unready, pending, coming_soon
 */
function checkReadinessDrift() {
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
  const pattern = new RegExp(
    `(?:^|[^\\w])(?:status|state)\\s*:\\s*["'](${DISALLOWED.join("|")})["']`,
    "g",
  );

  const targets = ["app", "lib", "components"]
    .map((d) => path.join(ROOT, d))
    .filter((p) => exists(p));

  const offenders = [];

  for (const dir of targets) {
    const files = walk(dir, {
      includeExts: [".ts", ".tsx"],
      ignoreDirs: ["__tests__", "dist"],
    });
    for (const f of files) {
      if (f.includes(".test.")) continue;
      const text = readText(f);
      let m;
      // eslint-disable-next-line no-cond-assign
      while ((m = pattern.exec(text)) !== null) {
        offenders.push({ path: rel(f), values: [m[1]] });
      }
    }
  }

  if (offenders.length) {
    const byPath = new Map();
    for (const o of offenders) {
      const key = o.path;
      if (!byPath.has(key)) byPath.set(key, new Set());
      byPath.get(key).add(o.values[0]);
    }
    const msg =
      `CHECK 20 (Readiness drift) failed:\n` +
      [...byPath.entries()]
        .map(([p, vals]) => `- ${p}: disallowed readiness values: ${[...vals].join(", ")}`)
        .join("\n") +
      `\n\nFix: Use only canonical readiness vocabulary: missing | partial | ready | error.
See lib/contracts/readiness.ts.`;
    fail(msg);
  }

  console.log(
    "✅ CHECK 20 passed: No non-canonical readiness strings in app/lib/components (Phase 1 Lock #3).",
  );
}

/**
 * CHECK 21 — PHASE_1_DEFINITION.md must match enforced routes + readiness
 *
 * Enforces repo-truth LAW: the authoritative Phase 1 definition document must
 * contain the canonical readiness vocabulary and the exact API/UI routes
 * enforced by assert-api-routes and assert-ui-routes.
 */
function checkPhase1DefinitionDocMatchesEnforcedReality() {
  const docPath = path.join(ROOT, "docs", "00_truth", "phase1", "PHASE_1_DEFINITION.md");
  if (!exists(docPath)) {
    fail(
      `CHECK 21 (Phase 1 definition doc) failed:\n` +
        `- Missing required file: docs/00_truth/phase1/PHASE_1_DEFINITION.md\n\n` +
        `Fix: create PHASE_1_DEFINITION.md as the authoritative repo-truth LAW document.`,
    );
  }

  const text = readText(docPath);

  // Canonical readiness vocabulary (must appear as structured list or inline)
  const readinessOk =
    /missing\s*\|\s*partial\s*\|\s*ready\s*\|\s*error/.test(text) ||
    [/missing/, /partial/, /ready/, /error/].every((re) => re.test(text));

  if (!readinessOk) {
    fail(
      `CHECK 21 (Phase 1 definition doc) failed:\n` +
        `- docs/00_truth/phase1/PHASE_1_DEFINITION.md must contain canonical readiness vocabulary: missing | partial | ready | error\n\n` +
        `Fix: add the readiness vocabulary line to match lib/contracts/readiness.ts.`,
    );
  }

  // Required API routes section + all routes from assert-api-routes.mjs
  if (!/Required API Routes/i.test(text)) {
    fail(
      `CHECK 21 (Phase 1 definition doc) failed:\n` +
        `- Missing section header "Required API routes" (or "Required API Routes")\n\n` +
        `Fix: add a "Required API routes" section listing what assert-api-routes.mjs enforces.`,
    );
  }

  const apiRoutes = [
    "/export",
    "/account/delete",
    "/raw-events",
    "/events",
    "/timeline",
    "/lineage",
    "/derived-ledger/snapshot",
    "/derived-ledger/runs",
  ];
  const missingApi = apiRoutes.filter((r) => !text.includes(r));
  if (missingApi.length) {
    fail(
      `CHECK 21 (Phase 1 definition doc) failed:\n` +
        `- "Required API routes" section is missing these routes (enforced by assert-api-routes.mjs):\n` +
        missingApi.map((r) => `  - ${r}`).join("\n") +
        `\n\nFix: add all asserted API routes to PHASE_1_DEFINITION.md.`,
    );
  }

  // Required UI routes section + all routes from assert-ui-routes.mjs
  if (!/Required UI Routes/i.test(text)) {
    fail(
      `CHECK 21 (Phase 1 definition doc) failed:\n` +
        `- Missing section header "Required UI routes" (or "Required UI Routes")\n\n` +
        `Fix: add a "Required UI routes" section listing what assert-ui-routes.mjs enforces.`,
    );
  }

  const uiRoutes = [
    "app/(app)/(tabs)/_layout.tsx",
    "app/(app)/(tabs)/dash.tsx",
    "app/(app)/(tabs)/timeline/index.tsx",
    "app/(app)/(tabs)/timeline/[day].tsx",
    "app/(app)/(tabs)/manage.tsx",
    "app/(app)/(tabs)/library/index.tsx",
    "app/(app)/(tabs)/library/[category].tsx",
    "app/(app)/(tabs)/stats.tsx",
    "app/(app)/event/[id].tsx",
    "app/(app)/(tabs)/library/lineage/[canonicalEventId].tsx",
    "app/(app)/(tabs)/library/replay/day/[dayKey].tsx",
    "app/(app)/failures/index.tsx",
  ];
  const missingUi = uiRoutes.filter((r) => !text.includes(r));
  if (missingUi.length) {
    fail(
      `CHECK 21 (Phase 1 definition doc) failed:\n` +
        `- "Required UI routes" section is missing these route files (enforced by assert-ui-routes.mjs):\n` +
        missingUi.map((r) => `  - ${r}`).join("\n") +
        `\n\nFix: add all asserted UI routes to PHASE_1_DEFINITION.md.`,
    );
  }

  console.log(
    "✅ CHECK 21 passed: PHASE_1_DEFINITION.md contains canonical readiness + required API/UI routes.",
  );
}

/**
 * CHECK 22 — PHASE_2_DEFINITION.md must exist and contain required sections (Phase 2 LAW)
 *
 * Enforces repo-truth LAW for Phase 2: the authoritative Phase 2 definition document must
 * contain the required sections per Phase 2 invariants.
 *
 * Required sections:
 * - Authority & Truth Contract
 * - Logging Primitives
 * - No Proactive Prompts
 * - Uncertainty Visibility
 */
function checkPhase2DefinitionDoc() {
  const docPath = path.join(ROOT, "docs", "00_truth", "phase2", "PHASE_2_DEFINITION.md");
  if (!exists(docPath)) {
    fail(
      `CHECK 22 (Phase 2 definition doc) failed:\n` +
        `- Missing required file: docs/00_truth/phase2/PHASE_2_DEFINITION.md\n\n` +
        `Fix: create PHASE_2_DEFINITION.md as the authoritative Phase 2 repo-truth LAW document.`,
    );
  }

  const text = readText(docPath);

  const requiredSections = [
    "Authority & Truth Contract",
    "Logging Primitives",
    "No Proactive Prompts",
  ];

  const uncertaintyOk =
    text.includes("Uncertainty Visibility") || text.includes("Uncertainty as First-Class Truth");
  const missing = requiredSections.filter((section) => !text.includes(section));
  if (!uncertaintyOk) missing.push("Uncertainty Visibility or Uncertainty as First-Class Truth");

  if (missing.length) {
    fail(
      `CHECK 22 (Phase 2 definition doc) failed:\n` +
        `- docs/00_truth/phase2/PHASE_2_DEFINITION.md is missing required sections:\n` +
        missing.map((s) => `  - ${s}`).join("\n") +
        `\n\nFix: add all required sections to PHASE_2_DEFINITION.md per Phase 2 LAW.`,
    );
  }

  console.log(
    "✅ CHECK 22 passed: PHASE_2_DEFINITION.md contains Authority & Truth Contract, Logging Primitives, No Proactive Prompts, Uncertainty (Visibility or First-Class Truth).",
  );
}

/**
 * Console discipline — Jest guard must be enabled in test runs.
 * Ensures scripts/test/jest.setup.ts wires the console guard so proof-gate and npm test
 * fail on unexpected console.error/console.warn. Does not duplicate the gate; just verifies
 * the guard is present so it runs in the proof-gate path.
 */
function checkConsoleDisciplineGuardEnabled() {
  const setupPath = path.join(ROOT, "scripts", "test", "jest.setup.ts");
  if (!exists(setupPath)) {
    fail(
      "Console discipline: scripts/test/jest.setup.ts is missing. Jest must use the console guard (installConsoleGuard / failIfUnexpected).",
    );
  }
  const text = readText(setupPath);
  if (!text.includes("installConsoleGuard") || !text.includes("failIfUnexpected")) {
    fail(
      "Console discipline: scripts/test/jest.setup.ts must import and use installConsoleGuard and failIfUnexpected from ./consoleGuard so tests fail on unexpected console.error/console.warn.",
    );
  }
  const guardPath = path.join(ROOT, "scripts", "test", "consoleGuard.ts");
  if (!exists(guardPath)) {
    fail(
      "Console discipline: scripts/test/consoleGuard.ts is missing. Required for Jest console discipline.",
    );
  }
  console.log(
    "✅ Console discipline: Jest setup wires console guard (tests fail on unexpected console.error/console.warn).",
  );
}

// ---- CHECK registry (single source of truth) ----
const CHECKS = [
  { id: 1, fn: checkAdminHttpNotPublic },
  { id: 2, fn: checkClientNoDerivedWrites },
  { id: 3, fn: checkApiIdempotency },
  { id: 4, fn: checkApiNoGlobalFirestoreRootCollections },
  { id: 5, fn: checkAccountDeleteExecutorExists },
  // CHECK 6 is special: it validates map drift and orphan invariants against THIS registry
  { id: 7, fn: checkIosPodsNotCommitted },
  { id: 8, fn: checkPatchPackageIntegrity },
  { id: 9, fn: checkApiRoutesNoDirectAdminFirestore },
  { id: 10, fn: checkIamSnapshotsExist },
  { id: 11, fn: checkIamNoEditorRole },
  { id: 12, fn: checkIamNoDefaultServiceAccountBindings },
  { id: 13, fn: checkRuntimeServiceAccountsAllowlist },
  { id: 14, fn: checkCloudRunInvokerNotPublicAndGatewayOnly },
  { id: 15, fn: checkCanonicalKindsNoDrift },
  { id: 16, fn: checkPhase1ScopeDoc },
  { id: 17, fn: checkApiRawEventsFirstNoDerivedTargets },
  { id: 18, fn: checkCanonicalWriteIsImmutable },
  { id: 19, fn: checkDerivedWritersEmitLedgerRuns },
  { id: 20, fn: checkReadinessDrift },
  { id: 21, fn: checkPhase1DefinitionDocMatchesEnforcedReality },
  { id: 22, fn: checkPhase2DefinitionDoc },
];

function main() {
  console.log("Running Oli constitutional invariant CI checks...\n");

  const expectedCheckIds = CHECKS.map((c) => c.id).concat([6]).sort((a, b) => a - b);

  // Run all checks except CHECK 6 (special drift/orphan check)
  for (const c of CHECKS) c.fn();

  // Run drift/orphan enforcement against the registry
  checkInvariantMapNoDriftAndNoOrphans(expectedCheckIds); // CHECK 6

  // Console discipline: ensure Jest console guard is enabled (runs in proof-gate path)
  checkConsoleDisciplineGuardEnabled();

  // Client trust boundary guard (fetch, apiGetJsonAuthed, Phase 1 screens)
  const boundary = spawnSync("node", ["scripts/ci/assert-client-trust-boundary.mjs"], {
    cwd: ROOT,
    stdio: "inherit",
  });
  if (boundary.status !== 0) {
    process.exit(boundary.status ?? 1);
  }

  const phase3Specs = spawnSync("node", ["scripts/ci/assert-phase3-specs.mjs"], {
    cwd: ROOT,
    stdio: "inherit",
  });
  if (phase3Specs.status !== 0) {
    process.exit(phase3Specs.status ?? 1);
  }

  console.log("\n✅ All invariant checks passed.");
}

main();
