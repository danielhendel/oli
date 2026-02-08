// scripts/ci/assert-api-routes.mjs
import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";

function die(msg) {
  // eslint-disable-next-line no-console
  console.error(`ASSERT_API_ROUTES_FAILED: ${msg}`);
  process.exit(1);
}

const repoRoot = process.cwd();
const distEntry = path.join(repoRoot, "services/api/dist/src/index.js");

if (!fs.existsSync(distEntry)) {
  die(`Missing ${distEntry}. Did you run "npm run -w api build"?`);
}

let mod;
try {
  mod = await import(pathToFileURL(distEntry).href);
} catch (e) {
  die(`Failed to import ${distEntry}: ${e instanceof Error ? e.message : String(e)}`);
}

// Handle CJS/ESM interop deterministically
// Possible shapes:
//  - ESM default export: { default: app }
//  - CJS default export: { default: { default: app } } (interop weirdness)
//  - Named export: { app: app } (unlikely)
//  - Module itself is the app (very unlikely)
const candidate =
  mod?.default?.default ??
  mod?.default ??
  mod?.app ??
  mod;

const app = candidate;

if (!app) die("Could not resolve Express app export from services/api/dist/src/index.js");

const router = app._router;
const stack = router?.stack;

if (!Array.isArray(stack)) {
  die(
    `Resolved export is not an Express app (missing _router.stack). Keys: ${Object.keys(app).join(",")}`,
  );
}

function collectRoutesFromStack(stk) {
  /** @type {{method:string,path:string}[]} */
  const out = [];

  const walk = (layers) => {
    for (const layer of layers) {
      // Direct route
      if (layer?.route?.path && layer?.route?.methods) {
        const p = layer.route.path;
        for (const [m, enabled] of Object.entries(layer.route.methods)) {
          if (enabled) out.push({ method: m.toUpperCase(), path: p });
        }
        continue;
      }

      // Nested router
      const nested = layer?.handle?.stack;
      if (Array.isArray(nested)) walk(nested);
    }
  };

  walk(stk);
  return out;
}

const routes = collectRoutesFromStack(stack);

const mustHave = [
  { method: "POST", path: "/export" },
  { method: "POST", path: "/account/delete" },
  // Sprint 1 — Retrieval Surfaces (paths relative to /users/me router)
  { method: "GET", path: "/raw-events" },
  { method: "GET", path: "/events" },
  { method: "GET", path: "/timeline" },
  { method: "GET", path: "/lineage" },
  { method: "GET", path: "/derived-ledger/snapshot" },
  { method: "GET", path: "/derived-ledger/runs" },
];

// Hard fail if route table is empty — means we aren’t inspecting the right thing.
if (routes.length === 0) {
  die(
    `Route table is empty. This usually means the app export is wrong or routes weren't mounted. ` +
      `Export keys: ${Object.keys(mod ?? {}).join(",")}`,
  );
}

for (const req of mustHave) {
  const ok = routes.some(
    (r) =>
      r.method === req.method &&
      (Array.isArray(r.path) ? r.path.includes(req.path) : r.path === req.path),
  );
  if (!ok) {
    die(`Missing compiled route ${req.method} ${req.path}. Found: ${JSON.stringify(routes)}`);
  }
}

// eslint-disable-next-line no-console
console.log("ASSERT_API_ROUTES_OK");