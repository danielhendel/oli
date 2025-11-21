/* eslint-env node */
'use strict';

/**
 * Dev-only: neutralize @expo/cli CORS middleware regardless of build path.
 * We intercept resolver → return a virtual module that matches CLI’s expected exports.
 */

const Module = require('module');
const path = require('node:path');

const VIRTUAL_ID = path.resolve(__dirname, '.virtual-noop-cors.js');

// Build a no-op factory that returns an Express middleware (req,res,next) => next()
function createNoopCors() {
  return function (_req, _res, next) {
    next();
  };
}

// Seed a virtual module that exports BOTH the named and default forms:
//   export const createCorsMiddleware = ...
//   export default { createCorsMiddleware }
require.cache[VIRTUAL_ID] = {
  id: VIRTUAL_ID,
  filename: VIRTUAL_ID,
  loaded: true,
  exports: {
    createCorsMiddleware: createNoopCors,
    default: { createCorsMiddleware: createNoopCors },
  },
};

// Hook resolver: if the resolved path contains /middleware/CorsMiddleware, swap it.
const originalResolve = Module._resolveFilename;
Module._resolveFilename = function (request, parent, isMain, options) {
  const resolved = originalResolve.call(this, request, parent, isMain, options);
  if (resolved.includes(`${path.sep}middleware${path.sep}CorsMiddleware`)) {
    return VIRTUAL_ID;
  }
  return resolved;
};

// Extra guard: tolerate blank URL inputs during CLI bootstrap (dev-only)
try {
  const RealURL = URL;
  global.URL = function PatchedURL(u, b) {
    if (u == null || String(u).trim() === '') return new RealURL('http://127.0.0.1');
    return new RealURL(u, b);
  };
  global.URL.prototype = RealURL.prototype;
} catch {}
