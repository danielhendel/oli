// apps/mobile/metro.config.js
const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

const projectRoot = __dirname;
const config = getDefaultConfig(projectRoot);

// Keep Metro resolution local to this app (useful in monorepos)
config.resolver = config.resolver || {};
config.resolver.nodeModulesPaths = [path.resolve(projectRoot, 'node_modules')];
config.resolver.disableHierarchicalLookup = true;

// No aliases needed now that we aren’t importing `firebase/auth/react-native`.
// Leave `config.resolver.alias` undefined or minimal.
// No hard-pins for internal @firebase/* packages either.

module.exports = config;
