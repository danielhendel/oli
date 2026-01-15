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

  console.log(
    "✅ CHECK 1 passed: Admin/recompute HTTP endpoints are not declared public and require explicit invoker.",
  );
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
 */
function checkApiIdempotency() {
  const routesDir = path.join(ROOT, "services", "api", "src", "routes");
  if (!exists(routesDir)) return;

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
        if (col !== "users") offenders.push({ file: rel(f), col });
      }
    }
  }

  if (offenders.length) {
    fail(
      `CHECK 4 (API root collection must be users) failed:\n` +
        offenders.map((o) => `- ${o.file} — root collection "${o.col}"`).join("\n") +
        `\n\nFix: API must only start Firestore paths at collection("users"), then scope by uid.`,
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
 *  - docs/INVARIANTS_MAP.md must exist
 *  - no TODO/TBD/placeholder language
 *  - every CHECK implemented in this script appears in the map
 *  - every CHECK referenced in the map exists in this script
 *  - every invariant row has enforcement + verification fields
 *  - every "Files:" reference in the map must exist on disk (enforcement is real)
 */
function checkInvariantMapNoDriftAndNoOrphans(expectedCheckIds) {
  const docPath = path.join(ROOT, "docs", "INVARIANTS_MAP.md");
  if (!exists(docPath)) {
    fail(
      `CHECK 6 (Invariant map drift) failed:\n` +
        `- docs/INVARIANTS_MAP.md is missing\n\n` +
        `Fix: restore the invariant enforcement map.`,
    );
  }

  const text = readText(docPath);

  const forbidden = /\b(TODO|TBD|placeholder)\b/i;
  if (forbidden.test(text)) {
    fail(
      `CHECK 6 (Invariant map drift) failed:\n` +
        `- docs/INVARIANTS_MAP.md contains placeholder language (TODO/TBD/placeholder)\n\n` +
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
            `Missing in docs/INVARIANTS_MAP.md (implemented in code but not mapped):`,
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
      `Fix: update docs/INVARIANTS_MAP.md and/or scripts/ci/check-invariants.mjs so they match exactly.`,
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
        `\n\nFix: either restore the missing files or update docs/INVARIANTS_MAP.md so it only references real enforcement locations.`,
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
 * We enforce IAM invariants by parsing committed JSON snapshots under docs/iam/.
 */
function requiredIamSnapshots() {
  return [
    {
      id: "projectIam",
      file: path.join(ROOT, "docs", "iam", "project-iam-policy.snapshot.json"),
      description: "Project IAM policy snapshot (gcloud projects get-iam-policy ... --format=json)",
    },
    {
      id: "runServices",
      file: path.join(ROOT, "docs", "iam", "run-services-us-central1.snapshot.json"),
      description:
        "Cloud Run services list snapshot (gcloud run services list --region=us-central1 --format=json)",
    },
    {
      id: "functionsV2",
      file: path.join(ROOT, "docs", "iam", "functions-v2-us-central1.snapshot.json"),
      description:
        "Cloud Functions v2 list snapshot (gcloud functions list --v2 --regions=us-central1 --format=json)",
    },
    {
      id: "functionsV1",
      file: path.join(ROOT, "docs", "iam", "functions-v1-us-central1.snapshot.json"),
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
      "Missing required IAM snapshot files under docs/iam/:",
      ...missing.map((m) => `- ${rel(m.file)} — ${m.description}`),
      "",
      "Fix (generate + commit snapshots):",
      "",
      "  mkdir -p docs/iam",
      "  gcloud projects get-iam-policy oli-staging-fdbba --format=json > docs/iam/project-iam-policy.snapshot.json",
      "  gcloud run services list --project=oli-staging-fdbba --region=us-central1 --format=json > docs/iam/run-services-us-central1.snapshot.json",
      "  gcloud functions list --v2 --project=oli-staging-fdbba --regions=us-central1 --format=json > docs/iam/functions-v2-us-central1.snapshot.json",
      "  gcloud functions list --project=oli-staging-fdbba --regions=us-central1 --format=json > docs/iam/functions-v1-us-central1.snapshot.json",
      "",
      "Then commit the docs/iam/*.snapshot.json files.",
    ].join("\n");

    fail(help);
  }

  console.log("✅ CHECK 10 passed: Required IAM snapshot JSON files are present under docs/iam/.");
}

/**
 * CHECK 11 — roles/editor is forbidden in project IAM
 */
function checkIamNoEditorRole() {
  const policyPath = path.join(ROOT, "docs", "iam", "project-iam-policy.snapshot.json");
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
  const policyPath = path.join(ROOT, "docs", "iam", "project-iam-policy.snapshot.json");
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
  const runPath = path.join(ROOT, "docs", "iam", "run-services-us-central1.snapshot.json");
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
  const fn2Path = path.join(ROOT, "docs", "iam", "functions-v2-us-central1.snapshot.json");
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

  // Cloud Functions v1 list snapshot (only enforce if present in snapshot)
  const fn1Path = path.join(ROOT, "docs", "iam", "functions-v1-us-central1.snapshot.json");
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
        `\n\nFix: redeploy workloads to use dedicated service accounts and refresh docs/iam snapshots.`,
    );
  }

  console.log("✅ CHECK 13 passed: Cloud Run + Functions runtime identities match the allowlist.");
}

/**
 * CHECK 14 — Cloud Run must not be publicly invokable AND must be invokable by API Gateway
 *
 * Enforcement input is a committed IAM policy JSON for the Cloud Run service (CI has no GCP auth).
 *
 * Acceptable file locations (we support both to avoid breaking history):
 *  - cloudrun-oli-api-iam.json (repo root)
 *  - docs/iam/cloudrun-oli-api-iam.snapshot.json
 */
function checkCloudRunInvokerNotPublicAndGatewayOnly() {
  const candidates = [
    path.join(ROOT, "cloudrun-oli-api-iam.json"),
    path.join(ROOT, "docs", "iam", "cloudrun-oli-api-iam.snapshot.json"),
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

  // Require API Gateway SA to be an invoker (proves “all client traffic goes through gateway” at IAM boundary)
  const hasGatewaySa = invokerMembers.some((m) =>
    /gcp-sa-apigateway\.iam\.gserviceaccount\.com$/.test(String(m)),
  );
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
 * CHECK 15 — CanonicalEventKind must align exactly with ingestion rawEventKindSchema
 *
 * Prevents schema drift where backend claims canonical kinds that ingestion cannot produce.
 *
 * Sources of truth:
 * - lib/contracts/rawEvent.ts → rawEventKindSchema = z.enum([...])
 * - services/functions/src/types/health.ts → export type CanonicalEventKind = | '...'
 */
function checkCanonicalKindsNoDrift() {
  const rawEventPath = path.join(ROOT, "lib", "contracts", "rawEvent.ts");
  const healthPath = path.join(ROOT, "services", "functions", "src", "types", "health.ts");
  if (!exists(rawEventPath) || !exists(healthPath)) return;

  const rawText = readText(rawEventPath);
  const healthText = readText(healthPath);

  // Extract kinds from: rawEventKindSchema = z.enum(["sleep", ...])
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

  // Extract kinds from:
  // export type CanonicalEventKind = | 'sleep' | 'steps' ...
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

  const a = new Set(rawKinds);
  const b = new Set(canonicalKinds);

  const onlyInRaw = [...a].filter((k) => !b.has(k)).sort();
  const onlyInCanonical = [...b].filter((k) => !a.has(k)).sort();

  if (onlyInRaw.length || onlyInCanonical.length) {
    const lines = [
      `CHECK 15 (Canonical kind drift) failed:`,
      ``,
      `rawEventKindSchema (ingestion) and CanonicalEventKind (backend) must match EXACTLY.`,
      ``,
      onlyInRaw.length ? `Present only in rawEventKindSchema: ${onlyInRaw.join(", ")}` : null,
      onlyInCanonical.length ? `Present only in CanonicalEventKind: ${onlyInCanonical.join(", ")}` : null,
      ``,
      `Files:`,
      `- ${rel(rawEventPath)}`,
      `- ${rel(healthPath)}`,
      ``,
      `Fix: update CanonicalEventKind and/or rawEventKindSchema so the allowed kinds match.`,
    ].filter(Boolean);

    fail(lines.join("\n"));
  }

  console.log("✅ CHECK 15 passed: CanonicalEventKind matches rawEventKindSchema (no kind drift).");
}

/**
 * CHECK 16 — Phase 1 scope contract must exist and be non-trivial
 */
function checkPhase1ScopeDoc() {
  const p = path.join(ROOT, "docs", "PHASE_1_SCOPE.md");
  if (!exists(p)) {
    fail(
      `CHECK 16 (Phase 1 scope contract) failed:\n` +
        `- Missing required file: docs/PHASE_1_SCOPE.md\n\n` +
        `Fix: add docs/PHASE_1_SCOPE.md (binding Phase 1 scope contract).`,
    );
  }

  const text = readText(p).trim();

  // Fail-closed: must be meaningfully populated
  if (text.length < 400) {
    fail(
      `CHECK 16 (Phase 1 scope contract) failed:\n` +
        `- docs/PHASE_1_SCOPE.md is too small (${text.length} chars). It must be non-trivial and binding.\n\n` +
        `Fix: expand Phase 1 scope with required capabilities and invariants.`,
    );
  }

  const hasPlaceholders = /\b(TODO|TBD|PLACEHOLDER)\b/i.test(text);
  if (hasPlaceholders) {
    fail(
      `CHECK 16 (Phase 1 scope contract) failed:\n` +
        `- docs/PHASE_1_SCOPE.md contains placeholder language (TODO/TBD/PLACEHOLDER).\n\n` +
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

  // We intentionally only scan for derived/canonical collection names.
  // If the API ever needs to read these, do it through safe endpoints, not Firestore paths.
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
];

function main() {
  console.log("Running Oli constitutional invariant CI checks...\n");

  const expectedCheckIds = CHECKS.map((c) => c.id).concat([6]).sort((a, b) => a - b);

  // Run core checks (except 6)
  for (const c of CHECKS) {
    c.fn();
  }

  // Run drift/orphan enforcement after core checks exist (it must validate against our registry)
  checkInvariantMapNoDriftAndNoOrphans(expectedCheckIds); // CHECK 6

  console.log("\n✅ All invariant checks passed.");
}

main();
