/** When true, emit high-volume per-day data diagnostics (cache hits, rollup traces). */
export function isDebugDataLogsEnabled(): boolean {
  return __DEV__ && process.env.EXPO_PUBLIC_DEBUG_DATA_LOGS === "1";
}
