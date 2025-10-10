// apps/mobile/babel.config.js
module.exports = function (api) {
  api.cache(true);
  return {
    presets: ['babel-preset-expo'],
    plugins: [
      'expo-router/babel',                           // 👉 needed for Expo Router
      ['module-resolver', { root: ['.'], alias: { '@': '.' } }],
      'react-native-reanimated/plugin',              // 👉 must be last
    ],
  };
};
