// scripts/ci/assert-ui-routes.mjs
/**
 * Phase 1 UI route invariants.
 * Fails CI if required route files are missing or renamed.
 *
 * Required UI routes (Phase 1):
 * - Tabs shell: _layout, dash, timeline, manage, library, stats
 * - Library: index, [category]
 * - Timeline: index, [day]
 * - Event detail: event/[id]
 * - Lineage: library/lineage/[canonicalEventId]
 * - Replay: library/replay/day/[dayKey]
 */

import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();

function die(msg) {
  // eslint-disable-next-line no-console
  console.error(`ASSERT_UI_ROUTES_FAILED: ${msg}`);
  process.exit(1);
}

const REQUIRED_UI_ROUTES = [
  // Tabs shell
  "app/(app)/(tabs)/_layout.tsx",
  "app/(app)/(tabs)/dash.tsx",
  "app/(app)/(tabs)/timeline/index.tsx",
  "app/(app)/(tabs)/timeline/[day].tsx",
  "app/(app)/(tabs)/manage.tsx",
  "app/(app)/(tabs)/library/index.tsx",
  "app/(app)/(tabs)/library/[category].tsx",
  "app/(app)/(tabs)/stats.tsx",

  // Event detail
  "app/(app)/event/[id].tsx",

  // Lineage
  "app/(app)/(tabs)/library/lineage/[canonicalEventId].tsx",

  // Replay
  "app/(app)/(tabs)/library/replay/day/[dayKey].tsx",

  // Failures (Phase 1 Lock #2)
  "app/(app)/failures/index.tsx",
];

const missing = REQUIRED_UI_ROUTES.filter((p) => !fs.existsSync(path.join(ROOT, p)));

if (missing.length) {
  die(
    `Missing required UI route files:\n${missing.map((p) => `  - ${p}`).join("\n")}\n\n` +
      `Phase 1 requires these routes to exist. Add or restore the missing files.`,
  );
}

// eslint-disable-next-line no-console
console.log("ASSERT_UI_ROUTES_OK");
