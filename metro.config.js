// metro.config.js
const { getDefaultConfig } = require("expo/metro-config");

/** @type {import("expo/metro-config").MetroConfig} */
const config = getDefaultConfig(__dirname);

/**
 * Firebase JS SDK (Auth) currently conflicts with Metro package.json "exports" in Expo SDK 53.
 * Workaround: disable package exports + allow .cjs resolution.
 */
config.resolver.unstable_enablePackageExports = false;

// Firebase ships some .cjs in the tree; ensure Metro can resolve them.
config.resolver.sourceExts = Array.from(
  new Set([...(config.resolver.sourceExts ?? []), "cjs"])
);

module.exports = config;
