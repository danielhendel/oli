/* eslint-env node */
'use strict';

/**
 * Prestart Guard — v6 (conditional localhost pin)
 * - Load minimal public env (Firebase + Google).
 * - Delete malformed Expo URL/Origin/HOST vars (defense-in-depth).
 * - Optionally pin localhost origins in dev to avoid "Invalid URL" (toggle with EXPO_FORCE_LOCALHOST).
 * - Prevent Expo from reloading .env.
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
function isNonEmpty(v) { return typeof v === 'string' && v.trim().length > 0; }
function isValidUrl(v) { try { new URL(v); return true; } catch { return false; } }

// 1) Load local envs (prefer .env.development, then .env).
loadEnv(path.join(process.cwd(), '.env.development'), { override: true });
loadEnv(path.join(process.cwd(), '.env'), { override: false });

// 1a) Delete empty-string envs
for (const k of Object.keys(process.env)) {
  if (process.env[k] === '') delete process.env[k];
}

// 1b) Delete malformed Expo URL/Origin/HOST vars (defense-in-depth)
const removed = [];
for (const k of Object.keys(process.env)) {
  if (!k.startsWith('EXPO_')) continue;
  const looksUrl = k.includes('ORIGIN') || k.includes('URL') || k.includes('HOST');
  if (!looksUrl) continue;
  const val = process.env[k];
  if (!isNonEmpty(val) || !isValidUrl(val)) {
    removed.push(`${k}${isNonEmpty(val) ? `="${val}"` : ''}`);
    delete process.env[k];
  }
}

// 1c) Conditionally pin localhost origins (dev-only safety net)
// Toggle with EXPO_FORCE_LOCALHOST (default "1" for local dev; set to "0" to disable).
const forceLocalhost = process.env.EXPO_FORCE_LOCALHOST ?? '1';
const shouldPin = /^(1|true|yes|on)$/i.test(String(forceLocalhost));
const pinned = [];
if (shouldPin) {
  const defaults = {
    EXPO_DEV_SERVER_ORIGIN: 'http://localhost:19000',
    EXPO_DEV_CLIENT_ORIGIN: 'http://localhost:19006',
  };
  for (const [k, v] of Object.entries(defaults)) {
    const cur = process.env[k];
    if (!isNonEmpty(cur) || !isValidUrl(cur)) {
      process.env[k] = v;
      pinned.push(`${k}=${v}`);
    }
  }
}

// 2) Validate required public keys (Firebase + Google)
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
const missing = required.filter((k) => !isNonEmpty(process.env[k]));
if (missing.length) {
  out('[env] ❌ missing keys:\n' + missing.map((k) => `  - ${k}`).join('\n'));
  process.exit(1);
}

// 3) Stop Expo from reloading .env
process.env.EXPO_NO_DOTENV = '1';
process.env.EXPO_SKIP_PLUGINS = process.env.EXPO_SKIP_PLUGINS || '';

// 4) Normalize boolean-ish flags
const boolDefaults = { CI: '0', EXPO_NO_INTERACTIVE: '0', EXPO_OFFLINE: '0', EXPO_DEBUG: '0' };
for (const [k, def] of Object.entries(boolDefaults)) {
  const v = process.env[k];
  process.env[k] = v === undefined || v === '' ? def
    : (/^(1|true|yes|on)$/i.test(String(v)) ? '1' : '0');
}

// 5) Final print (no secrets)
out('env: ✓ validated');
out('env: load .env.development .env');
out('env: export ' + required.join(' '));
if (removed.length) out('env: sanitized URL-ish keys →\n' + removed.map((s) => `  - ${s}`).join('\n'));
if (pinned.length) out('env: pinned safe defaults →\n' + pinned.map((s) => `  - ${s}`).join('\n'));
