// scripts/test/run-jest-with-firestore-emulator.mjs
import { spawn } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import net from "node:net";

/**
 * Goals:
 * - Run Jest with a Firestore emulator reliably on dev machines/CI.
 * - Avoid hardcoded ports (Docker often steals 8080/8081).
 * - Use a temp firebase.json that includes emulator config (host/port),
 *   and ensure firestore.rules / indexes paths exist in that temp config.
 *
 * Hardening:
 * - Fail if rules file is missing (avoid emulator allow-all masking rule regressions).
 * - Disable Emulator UI (no extra port noise; not needed for tests).
 * - Set GCLOUD_PROJECT + FIREBASE_PROJECT_ID defensively.
 */

function findRepoRoot(startDir) {
  let dir = startDir;
  while (true) {
    const candidate = path.join(dir, "firebase.json");
    if (fs.existsSync(candidate)) return dir;
    const parent = path.dirname(dir);
    if (parent === dir) break;
    dir = parent;
  }
  throw new Error(
    `Could not find repo root (firebase.json) starting from ${startDir}`
  );
}

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

function writeJson(filePath, value) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, JSON.stringify(value, null, 2) + "\n", "utf8");
}

function copyFileIfExists(absFrom, absTo) {
  if (!fs.existsSync(absFrom)) return false;
  fs.mkdirSync(path.dirname(absTo), { recursive: true });
  fs.copyFileSync(absFrom, absTo);
  return true;
}

function isObject(x) {
  return typeof x === "object" && x !== null && !Array.isArray(x);
}

function deepMerge(base, patch) {
  // simple deep merge where patch wins; objects merge; arrays replaced
  if (!isObject(base) || !isObject(patch)) return patch;
  const out = { ...base };
  for (const [k, v] of Object.entries(patch)) {
    out[k] = k in out ? deepMerge(out[k], v) : v;
  }
  return out;
}

function findFreePort(host = "127.0.0.1") {
  return new Promise((resolve, reject) => {
    const server = net.createServer();
    server.unref();
    server.on("error", reject);
    server.listen(0, host, () => {
      const addr = server.address();
      if (!addr || typeof addr === "string") {
        server.close(() => reject(new Error("Could not determine free port")));
        return;
      }
      const { port } = addr;
      server.close(() => resolve(port));
    });
  });
}

function run(cmd, args, env = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(cmd, args, {
      stdio: "inherit",
      shell: false,
      env: { ...process.env, ...env },
    });
    child.on("error", reject);
    child.on("exit", (code) => {
      if (code === 0) resolve();
      else reject(new Error(`${cmd} exited with code ${code}`));
    });
  });
}

async function main() {
  const repoRoot = findRepoRoot(process.cwd());
  const firebaseJsonPath = path.join(repoRoot, "firebase.json");

  const firestorePort = await findFreePort("127.0.0.1");

  // Keep temp config under node_modules/.cache so it’s easy to ignore and is local to repo.
  const cacheBase = path.join(repoRoot, "node_modules", ".cache");
  const stamp = `${Date.now()}-${Math.floor(Math.random() * 100000)}`;
  const tempRoot = path.join(cacheBase, `oli-fb-config-${stamp}`);

  fs.mkdirSync(tempRoot, { recursive: true });

  // Load the repo firebase.json
  const original = readJson(firebaseJsonPath);

  // Build a temp config:
  // - preserve existing keys
  // - ensure emulators.firestore host/port set (no CLI --host flags)
  // - disable UI (not needed for tests)
  const tempConfig = deepMerge(original, {
    emulators: deepMerge(original.emulators ?? {}, {
      firestore: {
        host: "127.0.0.1",
        port: firestorePort,
      },
      ui: {
        enabled: false,
      },
    }),
  });

  // Write the temp firebase.json first (so referenced relative paths are anchored to tempRoot)
  const tempFirebaseJsonPath = path.join(tempRoot, "firebase.json");
  writeJson(tempFirebaseJsonPath, tempConfig);

  // Ensure the firestore rules/indexes files exist at the temp paths.
  // Firebase resolves these relative to the firebase.json location.
  if (tempConfig.firestore?.rules) {
    const rel = tempConfig.firestore.rules;
    const src = path.resolve(repoRoot, rel);
    const dst = path.resolve(tempRoot, rel);
    const ok = copyFileIfExists(src, dst);
    if (!ok) {
      throw new Error(
        `Firestore rules file not found at ${src}. Refusing to run tests with allow-all rules.`
      );
    }
  } else {
    throw new Error(
      `firebase.json is missing "firestore.rules". Refusing to run tests with allow-all rules.`
    );
  }

  if (tempConfig.firestore?.indexes) {
    const rel = tempConfig.firestore.indexes;
    const src = path.resolve(repoRoot, rel);
    const dst = path.resolve(tempRoot, rel);
    // indexes are optional; copy if present
    copyFileIfExists(src, dst);
  }

  const projectId =
    process.env.GCLOUD_PROJECT ?? process.env.FIREBASE_PROJECT_ID ?? "demo-oli";
  const env = {
    FIRESTORE_EMULATOR_HOST: `127.0.0.1:${firestorePort}`,
    GCLOUD_PROJECT: projectId,
    FIREBASE_PROJECT_ID: projectId,
  };

  try {
    await run(
      "npx",
      [
        "firebase",
        "emulators:exec",
        "--only",
        "firestore",
        "--config",
        tempFirebaseJsonPath,
        "jest",
      ],
      env
    );
  } finally {
    // Allow opting out (useful when debugging temp config):
    //   KEEP_FB_TEMP=1 npm test
    if (!process.env.KEEP_FB_TEMP) {
      fs.rmSync(tempRoot, { recursive: true, force: true });
    } else {
      console.log(`[info] KEEP_FB_TEMP set; leaving temp config at: ${tempRoot}`);
    }
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});