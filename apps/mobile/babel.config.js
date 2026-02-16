// apps/mobile/babel.config.js
module.exports = function (api) {
  api.cache(true);

  const baseAlias = {
    "@": "./",
  };

  return {
    presets: ["babel-preset-expo"],
    plugins: [
      // ❌ keep expo-router/babel removed (deprecated in SDK 50+)
      [
        "module-resolver",
        {
          root: ["."],
          alias: baseAlias,
          extensions: [".ts", ".tsx", ".js", ".jsx", ".json"],
        },
      ],
      "react-native-reanimated/plugin", // must be last
    ],
    env: {
      // In tests, remap core to the jest mock so `ready()` is a function
      test: {
        plugins: [
          [
            "module-resolver",
            {
              root: ["."],
              alias: {
                "@/lib/firebase/core": "./__mocks__/firebase-core.jest.ts",
                ...baseAlias,
              },
              extensions: [".ts", ".tsx", ".js", ".jsx", ".json"],
            },
          ],
        ],
      },
    },
  };
};
