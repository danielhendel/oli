/**
 * Completion haptic for rest timer.
 * No-op: no require("expo-haptics") or any native haptics in the timer flow.
 * Stability over haptics; timer completion must never crash.
 */

export function playCompletionHaptic(): void {
  /* no-op: no haptics in timer flow to avoid runtime crash (unknown module) */
}
