/**
 * Metro configuration for Expo (Health OS / Oli project)
 * -----------------------------------------------------
 * This version includes the stable CORS/hostname patch required for Expo SDK 54
 * and ensures correct node module resolution in monorepos.
 */

const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

const projectRoot = __dirname;
const config = getDefaultConfig(projectRoot);

// ✅ Ensure Metro resolves local node_modules correctly (monorepo safe)
config.resolver = config.resolver || {};
config.resolver.nodeModulesPaths = [path.resolve(projectRoot, 'node_modules')];

// ✅ Patch: Defensive middleware hook for Expo CLI hostname null bug
// (Prevents "TypeError: Cannot read properties of null (reading 'hostname')")

// This patch hooks into the server creation to safely ignore null hostnames.
config.server = config.server || {};
config.server.enhanceMiddleware = (middleware) => {
  return (req, res, next) => {
    try {
      // If the request or host header is missing, skip CORS logic safely
      if (!req || !req.headers || !req.headers.host) {
        return next();
      }
      return middleware(req, res, next);
    } catch (e) {
      console.warn('⚠️  Ignored Expo CORS middleware error:', e.message);
      return next();
    }
  };
};

// ✅ (Optional) You can add additional server settings here later
// e.g., custom watch folders, logging, or HMR overrides.

module.exports = config;
