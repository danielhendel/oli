/* eslint-env node */
'use strict';

/**
 * Prestart Guard — v4 (final)
 * Goal: Load minimal env for app (Firebase + Google). DO NOT pin/emit any URL-ish vars.
 * Why: Expo CLI rehydrates env and its CORS middleware crashes if URL-ish vars are malformed.
 * This script validates app env, prints what we export, and leaves URL decisions to Expo itself.
 */

const path = require('node:path');
const process = require('node:process');
const dotenv = require('dotenv');
const dotenvExpand = require('dotenv-expand');

const out = (msg) => process.stdout.write(String(msg) + '\n');

function loadEnv(p, opts) {
  const r = dotenv.config({ path: p, ...opts });
  if (r.parsed) dotenvExpand.expand(r);
  return r;
}

// 1) Load local envs (prefer .env.development, then .env), but DO NOT set URL-ish vars.
loadEnv(path.join(process.cwd(), '.env.development'), { override: true });
loadEnv(path.join(process.cwd(), '.env'), { override: false });

// 2) Validate required public keys (Firebase + Google). Keep this list minimal and non-URL.
const required = [
  'EXPO_PUBLIC_FIREBASE_API_KEY',
  'EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN',
  'EXPO_PUBLIC_FIREBASE_PROJECT_ID',
  'EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET',
  'EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID',
  'EXPO_PUBLIC_FIREBASE_APP_ID',
  'EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID',
  'EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID',
];

const missing = required.filter((k) => !process.env[k] || String(process.env[k]).trim() === '');
if (missing.length) {
  out('[env] ❌ missing keys:\n' + missing.map((k) => `  - ${k}`).join('\n'));
  process.exit(1);
}

// 3) Ensure Expo doesn’t auto-load any .env when it starts (we’ve already loaded what we need).
// These flags are purposely not boolean-parsed by Expo; strings are fine.
process.env.EXPO_NO_DOTENV = '1';           // prevent Expo from importing .env* again
process.env.EXPO_SKIP_PLUGINS = process.env.EXPO_SKIP_PLUGINS || ''; // leave blank unless needed

// 4) Normalize boolean-ish flags up-front to avoid GetEnv.NoBoolean later.
const boolDefaults = {
  CI: '0',
  EXPO_NO_INTERACTIVE: '0',
  EXPO_OFFLINE: '0',
  EXPO_DEBUG: '0',
};
for (const [k, def] of Object.entries(boolDefaults)) {
  const v = process.env[k];
  process.env[k] = v === undefined || v === '' ? def : (/^(1|true|yes|on)$/i.test(String(v)) ? '1' : '0');
}

// 5) Final print (no URL-ish keys shown)
out('env: ✓ validated');
out('env: load .env.development .env');
out('env: export ' + required.join(' '));
