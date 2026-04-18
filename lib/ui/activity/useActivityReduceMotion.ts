import { useEffect, useState } from "react";
import { AccessibilityInfo } from "react-native";

function isJestRuntime(): boolean {
  return typeof process !== "undefined" && process.env != null && Boolean(process.env.JEST_WORKER_ID);
}

/**
 * Mirrors system reduce-motion for subtle Activity tier transitions (width/color/pill).
 * In Jest, stays `false` and skips async Accessibility work so tests stay deterministic.
 */
export function useActivityReduceMotion(): boolean {
  const [reduceMotion, setReduceMotion] = useState(false);

  useEffect(() => {
    if (isJestRuntime()) {
      return undefined;
    }

    let cancelled = false;
    void AccessibilityInfo.isReduceMotionEnabled().then((v) => {
      if (cancelled) return;
      setReduceMotion(Boolean(v));
    });
    const sub = AccessibilityInfo.addEventListener("reduceMotionChanged", (enabled) => {
      if (cancelled) return;
      setReduceMotion(Boolean(enabled));
    });
    return () => {
      cancelled = true;
      sub.remove();
    };
  }, []);

  return reduceMotion;
}
