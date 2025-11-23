// apps/mobile/metro.config.js
const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

const projectRoot = __dirname;
const config = getDefaultConfig(projectRoot);

// Ensure the resolver object exists
config.resolver = config.resolver || {};

// Keep Metro resolution local to this app (useful in monorepos)
config.resolver.nodeModulesPaths = [path.resolve(projectRoot, 'node_modules')];

// Workaround for libraries (like firebase) that don't yet fully
// cooperate with Metro's package "exports" resolution.
config.resolver.unstable_enablePackageExports = false;

// IMPORTANT: Let Expo defaults handle hierarchical lookup
// (expo-doctor expects false; removing the override is safest)
// Do NOT set: config.resolver.disableHierarchicalLookup = true;

module.exports = config;
