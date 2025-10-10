// apps/mobile/babel.config.js
module.exports = function (api) {
  api.cache(true);
  return {
    presets: ['babel-preset-expo'],
    plugins: [
      // ❌ remove 'expo-router/babel' (deprecated in SDK 50+)
      ['module-resolver', { root: ['.'], alias: { '@': '.' } }],
      'react-native-reanimated/plugin', // must be last
    ],
  };
};
