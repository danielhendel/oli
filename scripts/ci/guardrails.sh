#!/usr/bin/env bash
set -euo pipefail

echo "guardrails: start"

# ------------------------------------------------------------
# 1) No vendored/duplicate contracts directory
# ------------------------------------------------------------
if [ -d "services/api/lib/contracts" ]; then
  echo "guardrails: FAIL - services/api/lib/contracts exists (vendoring not allowed)"
  exit 1
fi

# ------------------------------------------------------------
# 2) API must depend on @oli/contracts with exact workspace version
# ------------------------------------------------------------
node - <<'NODE'
const path = require("path");

const api = require(path.resolve("services/api/package.json"));
const contracts = require(path.resolve("lib/contracts/package.json"));

const dep = api.dependencies?.["@oli/contracts"];
if (!dep) {
  console.error('guardrails: FAIL - services/api missing dependencies["@oli/contracts"]');
  process.exit(1);
}

if (dep !== contracts.version) {
  console.error(
    `guardrails: FAIL - services/api @oli/contracts must equal lib/contracts version (${contracts.version}), got ${JSON.stringify(dep)}`
  );
  process.exit(1);
}
NODE

# ------------------------------------------------------------
# 3) Runtime resolution check (workspace link, not vendored)
# ------------------------------------------------------------
node - <<'NODE'
const fs = require("fs");
const path = require("path");

const runtimeBase = path.resolve("services/api/dist/src");

// Guardrail assumes API build already ran in CI
if (!fs.existsSync(runtimeBase)) {
  console.error(
    `guardrails: FAIL - expected ${runtimeBase} to exist. Run npm run -w api build first.`
  );
  process.exit(1);
}

let resolved;
try {
  resolved = require.resolve("@oli/contracts/package.json", {
    paths: [runtimeBase],
  });
} catch {
  console.error(
    "guardrails: FAIL - cannot resolve @oli/contracts from API runtime context (services/api/dist/src)"
  );
  process.exit(1);
}

const real = fs.realpathSync(resolved).replace(/\\/g, "/");
if (!real.includes("/lib/contracts/")) {
  console.error(
    `guardrails: FAIL - @oli/contracts is not workspace-linked (expected realpath to include /lib/contracts/). ` +
    `resolved=${resolved} realpath=${real}`
  );
  process.exit(1);
}

console.log("guardrails: contracts_resolve_ok", { resolved, realpath: real });
NODE

# ------------------------------------------------------------
# 4) Root lockfile enforcement (ignore node_modules)
# ------------------------------------------------------------
if [ ! -f "package-lock.json" ]; then
  echo "guardrails: FAIL - root package-lock.json missing"
  exit 1
fi

# Ignore vendored lockfiles inside node_modules
nested_lockfiles="$(
  find . \
    -path "./node_modules" -prune -o \
    -name "package-lock.json" \
    -not -path "./package-lock.json" \
    -print
)"

if [ -n "$nested_lockfiles" ]; then
  echo "guardrails: FAIL - nested package-lock.json files found (outside node_modules):"
  echo "$nested_lockfiles"
  exit 1
fi

echo "guardrails: OK"