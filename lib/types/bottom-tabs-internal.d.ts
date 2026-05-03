/** Avoid importing `@react-navigation/bottom-tabs` entry (pulls transition graphs); runtime-safe subpaths for tab metrics only. */
declare module "@react-navigation/bottom-tabs/lib/module/utils/BottomTabBarHeightContext.js" {
  import type { Context } from "react";
  export const BottomTabBarHeightContext: Context<number | undefined>;
}

declare module "@react-navigation/bottom-tabs/lib/module/utils/BottomTabBarHeightCallbackContext.js" {
  import type { Context } from "react";
  export const BottomTabBarHeightCallbackContext: Context<((height: number) => void) | undefined>;
}
