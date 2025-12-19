export {};

declare global {
  // Expo/Metro provides `process.env` at runtime, but TS needs a type.
  const process: {
    env: Record<string, string | undefined>;
  };
}
