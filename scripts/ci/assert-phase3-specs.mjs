#!/usr/bin/env node
/**
 * Phase 3 governance: binding spec files must exist in repo.
 * Fails if Phase 3A or Phase 3B.1 spec is missing.
 */
import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();
const REQUIRED = [
  "docs/00_truth/phase3/PHASE_3A_PASSIVE_DEVICE_INGESTION.md",
  "docs/00_truth/phase3/PHASE_3B1_WEIGHT_MAGIC.md",
];

function main() {
  const missing = REQUIRED.filter((p) => !fs.existsSync(path.join(ROOT, p)));
  if (missing.length) {
    console.error("ASSERT_PHASE3_SPECS_FAILED: Missing binding spec files:");
    missing.forEach((p) => console.error("  -", p));
    process.exit(1);
  }
  console.log("ASSERT_PHASE3_SPECS_OK");
}

main();
