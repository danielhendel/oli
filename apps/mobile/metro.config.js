// apps/mobile/metro.config.js
const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

const projectRoot = __dirname;
const config = getDefaultConfig(projectRoot);

// Keep Metro resolution local to this app (useful in monorepos)
config.resolver = config.resolver || {};
config.resolver.nodeModulesPaths = [path.resolve(projectRoot, 'node_modules')];

// IMPORTANT: Let Expo defaults handle hierarchical lookup
// (expo-doctor expects false; removing the override is safest)
// Do NOT set: config.resolver.disableHierarchicalLookup = true;

module.exports = config;
