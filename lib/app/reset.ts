// lib/app/reset.ts

/**
 * Best-effort local reset for destructive account actions.
 *
 * - Clears AsyncStorage keys (caches, pending refreshBus events, etc.)
 * - Leaves Firebase/Auth sign-out to callers
 */
export async function clearLocalAppState(): Promise<void> {
    try {
      const mod = await import("@react-native-async-storage/async-storage");
      const s = (mod as unknown as { default?: unknown }).default ?? (mod as unknown);
      const AsyncStorage = s as { clear(): Promise<void> };
      await AsyncStorage.clear();
    } catch {
      // no-op
    }
  }
  