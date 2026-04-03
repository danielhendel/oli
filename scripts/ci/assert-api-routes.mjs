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

console.log("ASSERT_API_ROUTES_OK");
