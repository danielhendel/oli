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

  console.log("✅ CHECK 1 passed: Admin/recompute HTTP endpoints are not declared public and require explicit invoker.");
}

/**
 * CHECK 2 — Client must not write derived truth
 */
function checkClientNoDerivedWrites() {
  const targets = [path.join(ROOT, "app"), path.join(ROOT, "lib")].filter(exists);
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
        `\n\nFix: API must only start Firestore paths at collection("users"), then scope by uid.`
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
        `Fix: add a Functions Gen2 onMessagePublished("${topic}") executor that performs deletion.`
    );
  }

  console.log("✅ CHECK 5 passed: Account deletion route has a Functions Pub/Sub executor.");
}

/**
 * CHECK 6 — Invariant documentation must be binding, not scaffolding
 */
function checkInvariantDocsAreBinding() {
  const docPath = path.join(ROOT, "docs", "INVARIANTS_MAP.md");

  if (!exists(docPath)) {
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
        `3) Pods must be generated locally (pod install / expo prebuild), never committed`
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
        `Fix: commit package-lock.json so patch integrity can be validated.`
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
        `- patches/${f} — version mismatch for "${parsed.pkg}": patch=${parsed.version}, lock=${installed}`
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
        `3) Remove obsolete patch.`
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
        `- That adapter is where we enforce scoping/instrumentation.\n`
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
        .join("\n") +
      "\n\nFix: remove roles/editor bindings from the project IAM policy.";
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
        runOffenders.push(`- Cloud Run ${name}: serviceAccountName=${String(sa)} (expected ${EXPECTED.apiRuntimeSa})`);
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
      fn2Offenders.push(`- Functions v2 ${name}: serviceAccountEmail=${String(sa)} (expected ${EXPECTED.functionsRuntimeSa})`);
    }
  }

  if (!fn2Arr.length) {
    fn2Offenders.push("- Functions v2 snapshot is empty (unexpected)");
  }

  // Cloud Functions v1 list snapshot (only enforce if present in snapshot; must be runtime SA)
  const fn1Path = path.join(ROOT, "docs", "iam", "functions-v1-us-central1.snapshot.json");
  const fn1 = readJson(fn1Path);
  const fn1Arr = Array.isArray(fn1) ? fn1 : [];
  const fn1Offenders = [];

  for (const f of fn1Arr) {
    const name = f?.name;
    const sa = f?.serviceAccountEmail;
    if (!name) continue;

    // Enforce only for v1 functions that actually exist in this repo (snapshot-driven)
    if (sa && sa !== EXPECTED.functionsRuntimeSa) {
      fn1Offenders.push(`- Functions v1 ${name}: serviceAccountEmail=${String(sa)} (expected ${EXPECTED.functionsRuntimeSa})`);
    }
  }

  const offenders = [...runOffenders, ...fn2Offenders, ...fn1Offenders];
  if (offenders.length) {
    fail(
      `CHECK 13 (Runtime service accounts allowlist) failed:\n` +
        offenders.join("\n") +
        `\n\nFix: redeploy workloads to use dedicated service accounts and refresh docs/iam snapshots.`
    );
  }

  console.log("✅ CHECK 13 passed: Cloud Run + Functions runtime identities match the allowlist.");
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
  checkPatchPackageIntegrity();
  checkApiRoutesNoDirectAdminFirestore();

  // IAM / security-blocking checks (Sprint 1)
  checkIamSnapshotsExist(); // CHECK 10
  checkIamNoEditorRole(); // CHECK 11
  checkIamNoDefaultServiceAccountBindings(); // CHECK 12
  checkRuntimeServiceAccountsAllowlist(); // CHECK 13

  console.log("\n✅ All invariant checks passed.");
}

main();
