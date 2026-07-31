/**
 * Feature flag: Labs OS v1 (Phase 3D-A extraction + review + accepted history).
 *
 * EXPO_PUBLIC_LABS_OS_V1:
 * - unset / "1" / unexpected → enabled
 * - "0" → Phase 3C stored-document Labs behavior (no review UI / accepted history surfaces)
 */

let testOverride: boolean | null = null;

export function isLabsOsV1Enabled(
  env: Record<string, string | undefined> = process.env as Record<string, string | undefined>,
): boolean {
  if (testOverride !== null) return testOverride;
  const raw = env.EXPO_PUBLIC_LABS_OS_V1;
  if (raw === "0") return false;
  return true;
}

export function setLabsOsV1EnabledForTests(value: boolean | null): void {
  testOverride = value;
}
