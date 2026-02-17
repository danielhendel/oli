// scripts/ci/assert-api-routes.mjs
import fs from "node:fs";
import path from "node:path";

function die(msg) {
  console.error(`ASSERT_API_ROUTES_FAILED: ${msg}`);
  process.exit(1);
}

const repoRoot = process.cwd();
const indexTs = path.join(repoRoot, "services/api/src/index.ts");

if (!fs.existsSync(indexTs)) {
  die("Missing services/api/src/index.ts");
}

const indexText = fs.readFileSync(indexTs, "utf8");

/**
 * Phase 3A: status route must exist in integrations router
 */
if (!indexText.includes('"/integrations"') || !indexText.includes("integrationsRoutes")) {
  die("Integrations router not mounted at /integrations");
}

/**
 * Phase 3B: pull route must be mounted with requireInvokerAuth
 */
if (
  !indexText.includes('"/integrations/withings/pull"') ||
  !indexText.includes("requireInvokerAuth") ||
  !indexText.includes("withingsPullRouter")
) {
  die("Missing or improperly mounted POST /integrations/withings/pull");
}

/**
 * Phase 3B.1: backfill route must be mounted with requireInvokerAuth
 */
if (
  !indexText.includes('"/integrations/withings/backfill"') ||
  !indexText.includes("requireInvokerAuth") ||
  !indexText.includes("withingsBackfillRouter")
) {
  die("Missing or improperly mounted POST /integrations/withings/backfill");
}

/**
 * Ensure backfill route file exists
 */
const backfillRoute = path.join(repoRoot, "services/api/src/routes/withingsBackfill.ts");
if (!fs.existsSync(backfillRoute)) {
  die("withingsBackfill.ts route file missing");
}

/**
 * Ensure pull route file exists
 */
const pullRoute = path.join(repoRoot, "services/api/src/routes/withingsPull.ts");
if (!fs.existsSync(pullRoute)) {
  die("withingsPull.ts route file missing");
}

console.log("ASSERT_API_ROUTES_OK");
