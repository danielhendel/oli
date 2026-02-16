// scripts/check-env.mjs
import fs from "fs";

const ENV_FILE = ".env.local";

function parseEnvFile(path) {
  if (!fs.existsSync(path)) {
    fail(`Missing ${path}. Run "npm run env:use:dev" or "npm run env:use:prod".`);
  }
  const text = fs.readFileSync(path, "utf8");
  const out = {};
  for (const raw of text.split(/\r?\n/)) {
    const line = raw.trim();
    if (!line || line.startsWith("#")) continue;
    const eq = line.indexOf("=");
    if (eq === -1) continue;
    const k = line.slice(0, eq).trim();
    let v = line.slice(eq + 1).trim();
    if (v.startsWith('"') && v.endsWith('"')) v = v.slice(1, -1);
    out[k] = v;
  }
  return out;
}

function fail(msg) {
  console.error(`\n❌ Env check failed: ${msg}\n`);
  process.exit(1);
}

const env = parseEnvFile(ENV_FILE);
const appEnv = env.APP_ENV;

if (!appEnv || !["dev", "preview", "prod"].includes(appEnv)) {
  fail(`APP_ENV must be one of "dev" | "preview" | "prod". Found: ${appEnv ?? "(missing)"}`);
}

// Always required
const mustHave = ["EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID"];
for (const k of mustHave) {
  if (!env[k]) fail(`Missing required var: ${k}`);
}

// Basic sanity for Google iOS client id
if (!/\.apps\.googleusercontent\.com$/.test(env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID)) {
  fail(`EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID must end with ".apps.googleusercontent.com".`);
}

if (appEnv === "prod") {
  const prodKeys = [
    "EXPO_PUBLIC_FIREBASE_API_KEY",
    "EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN",
    "EXPO_PUBLIC_FIREBASE_PROJECT_ID",
    "EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET",
    "EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID",
    "EXPO_PUBLIC_FIREBASE_APP_ID",
  ];
  for (const k of prodKeys) {
    if (!env[k] || /YOUR_PROD_|__REPLACE__/i.test(env[k])) {
      fail(`Prod var ${k} is missing or still a placeholder.`);
    }
  }
} else if (appEnv === "dev") {
  // Dev must not point to real prod hosts accidentally
  if (/firebaseapp\.com$/.test(env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN || "")) {
    console.warn(
      "⚠️  Dev env appears to use a real firebaseapp.com auth domain. " +
        "Make sure you're intentionally hitting prod or switch to emulators."
    );
  }
}

console.log("✅ Env check passed for", appEnv);
