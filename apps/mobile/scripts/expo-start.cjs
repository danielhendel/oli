/* eslint-env node */
/* global process */
'use strict';

/**
 * Hardened Expo launcher — v10 (LAN mode, URL hardening, CORS shim preload)
 */

const { spawn } = require('node:child_process');
const os = require('node:os');
const path = require('node:path');
const dotenv = require('dotenv');
const dotenvExpand = require('dotenv-expand');

const loadEnv = (p, opts) => {
  const r = dotenv.config({ path: p, ...opts });
  if (r.parsed) dotenvExpand.expand(r);
  return r;
};

loadEnv(path.join(process.cwd(), '.env.development'), { override: true });
loadEnv(path.join(process.cwd(), '.env'), { override: false });

// Guard (validates app keys + disables Expo dotenv)
require('./prestart.cjs');

const port = Number(process.env.PORT || 8082);

// Choose a stable LAN IPv4 (fallback to loopback)
function getLanIp() {
  const ifaces = os.networkInterfaces();
  for (const name of Object.keys(ifaces)) {
    for (const info of ifaces[name] || []) {
      if (info && info.family === 'IPv4' && !info.internal) return info.address;
    }
  }
  return '127.0.0.1';
}
const ip = getLanIp();
const devUrl = `http://${ip}:${port}`;

// Build child env
const childEnv = { ...process.env };

// Strip + set URL-ish keys
const urlKeys = [
  'EXPO_ORIGIN','EXPO_SERVER_URL','EXPO_SERVER_ORIGIN',
  'EXPO_DEV_CLIENT_PUBLIC_URL','EXPO_DEV_SERVER_URL','EXPO_DEV_SERVER_ORIGIN',
  'EXPO_PACKAGER_PROXY_URL','EXPO_PACKAGER_PROXY_ORIGIN',
  'EXPO_WEB_URL','PUBLIC_URL','ORIGIN',
  'EXPO_CORS_ORIGIN','EXPO_CORS_URL','CORS_ORIGIN','CORS_URL',
];
for (const k of urlKeys) delete childEnv[k];
for (const k of urlKeys) childEnv[k] = devUrl;

// Don’t let Expo re-import .env files again
childEnv.EXPO_NO_DOTENV = '1';

// Normalize booleans
for (const k of ['CI','EXPO_NO_INTERACTIVE','EXPO_OFFLINE','EXPO_DEBUG','HTTPS','EXPO_HTTPS']) {
  const v = childEnv[k];
  childEnv[k] = v === undefined || v === '' ? '0' : (/^(1|true|yes|on)$/i.test(String(v)) ? '1' : '0');
}

// Stability helpers
childEnv.HOST = 'lan';
childEnv.EXPO_USE_DEV_SERVER = '1';
childEnv.PROTOCOL = 'http';
childEnv.HTTPS = '0';
childEnv.EXPO_HTTPS = '0';

// Nuke proxy vars
for (const pvar of ['HTTP_PROXY','HTTPS_PROXY','ALL_PROXY','NO_PROXY','http_proxy','https_proxy','all_proxy','no_proxy']) {
  delete childEnv[pvar];
}

// NEW: preload our CORS shim
const shimPath = path.resolve(process.cwd(), 'scripts', 'shim-expo-cors.cjs');
const existingNodeOptions = childEnv.NODE_OPTIONS ? String(childEnv.NODE_OPTIONS) : '';
childEnv.NODE_OPTIONS = `${existingNodeOptions} --require ${shimPath}`.trim();

// DEBUG
console.log('— Expo child env (URL keys) —');
for (const k of urlKeys) console.log(`${k}=${childEnv[k] ?? '<unset>'}`);
console.log('HTTPS=' + childEnv.HTTPS, 'EXPO_HTTPS=' + childEnv.EXPO_HTTPS);
console.log('HOST=' + childEnv.HOST, 'EXPO_USE_DEV_SERVER=' + childEnv.EXPO_USE_DEV_SERVER, 'IP=' + ip);
console.log('NODE_OPTIONS=' + childEnv.NODE_OPTIONS);
console.log('--------------------------------');

// Use local Expo CLI binary
const expoBin = path.resolve(process.cwd(), 'node_modules', '.bin', process.platform === 'win32' ? 'expo.cmd' : 'expo');

// Start in LAN mode
const args = ['start', '--port', String(port), '--clear', '--host', 'lan'];
console.log(`▶️  ${expoBin} ${args.join(' ')}`);

const child = spawn(expoBin, args, {
  stdio: 'inherit',
  env: childEnv,
  shell: false,
});

child.on('exit', (code) => process.exit(code ?? 0));
child.on('error', (err) => {
  console.error('Expo failed to start:', err);
  process.exit(1);
});
