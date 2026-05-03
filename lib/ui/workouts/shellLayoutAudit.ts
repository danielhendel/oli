import type { LayoutChangeEvent } from "react-native";

/**
 * Set `EXPO_PUBLIC_OLI_SHELL_LAYOUT_AUDIT=1` in `.env.local` and rebuild to log `[HEIGHT_AUDIT]`
 * `onLayout` sizes on device. Off by default — no console output in normal dev/production.
 */
export function isShellLayoutAuditEnabled(): boolean {
  return (
    typeof __DEV__ !== "undefined" &&
    __DEV__ &&
    typeof process !== "undefined" &&
    process.env.EXPO_PUBLIC_OLI_SHELL_LAYOUT_AUDIT === "1"
  );
}

export function logShellLayoutAudit(tag: string, e: LayoutChangeEvent): void {
  if (!isShellLayoutAuditEnabled()) return;
  const { height, width, x, y } = e.nativeEvent.layout;
  // eslint-disable-next-line no-console -- gated by isShellLayoutAuditEnabled(); see module doc
  console.log(`[HEIGHT_AUDIT] ${tag}`, { width, height, x, y });
}
