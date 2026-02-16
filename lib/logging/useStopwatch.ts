// lib/logging/useStopwatch.ts
import * as React from "react";

type Stopwatch = {
  elapsedMs: number;
  running: boolean;
  start: () => void;
  stop: () => void;
  reset: () => void;
};

function nowMs(): number {
  // Try perf.now if present (Hermes/JSC may expose it), otherwise Date.now
  const perf: unknown = (globalThis as unknown as { performance?: { now?: () => number } }).performance;
  if (perf && typeof (perf as { now?: () => number }).now === "function") {
    return (perf as { now: () => number }).now!();
  }
  return Date.now();
}

/** Lightweight stopwatch for UI timing; not persisted. */
export default function useStopwatch(initialMs = 0): Stopwatch {
  const [elapsedMs, setElapsedMs] = React.useState<number>(initialMs);
  const [running, setRunning] = React.useState<boolean>(false);

  const startedAtRef = React.useRef<number>(nowMs() - initialMs);
  const timerRef = React.useRef<number | null>(null);

  const tick = React.useCallback(() => {
    setElapsedMs(nowMs() - startedAtRef.current);
  }, []);

  const start = React.useCallback(() => {
    if (running) return;
    startedAtRef.current = nowMs() - elapsedMs;
    setRunning(true);
    // 100ms feels smooth enough for UI; adjust if you like.
    timerRef.current = setInterval(tick, 100) as unknown as number;
  }, [elapsedMs, running, tick]);

  const stop = React.useCallback(() => {
    setRunning(false);
    if (timerRef.current != null) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const reset = React.useCallback(() => {
    startedAtRef.current = nowMs();
    setElapsedMs(0);
  }, []);

  React.useEffect(() => {
    return () => {
      if (timerRef.current != null) clearInterval(timerRef.current);
    };
  }, []);

  return { elapsedMs, running, start, stop, reset };
}
