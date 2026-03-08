/**
 * Haptic must never throw; missing or broken expo-haptics must not crash the app.
 * We do not mock expo-haptics so that we test the real fallback (require may throw in some envs).
 */

import { playCompletionHaptic } from "../haptic";

describe("haptic", () => {
  it("playCompletionHaptic never throws", () => {
    expect(() => {
      playCompletionHaptic();
    }).not.toThrow();
  });

  it("playCompletionHaptic is safe to call multiple times", () => {
    expect(() => {
      playCompletionHaptic();
      playCompletionHaptic();
    }).not.toThrow();
  });
});
