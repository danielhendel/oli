/**
 * Global rest timer — state lives here so it survives navigation.
 * Timestamp-based countdown (endTimeMs) for correctness across backgrounding.
 * Panel visibility is separate from timer state (dismiss = hide UI, timer keeps running).
 */

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { playCompletionHaptic } from "./haptic";
import {
  getLastRestTimerDurationSec,
  setLastRestTimerDurationSec,
} from "./restTimerStorage";

export type RestTimerStatus = "idle" | "running" | "paused" | "finished";

type RestTimerState = {
  status: RestTimerStatus;
  /** When running: absolute timestamp (ms) when countdown reaches 0 */
  endTimeMs: number | null;
  /** When paused: remaining ms */
  pausedRemainingMs: number | null;
  /** Total duration of current run (for display and reset) */
  totalDurationMs: number;
  /** UI panel expanded vs collapsed (swipe up = collapse, timer keeps running) */
  panelVisible: boolean;
  /** Last used duration in seconds (from storage, for presets/default) */
  lastDurationSec: number | null;
};

type RestTimerContextValue = RestTimerState & {
  /** Remaining ms (derived: from endTimeMs when running, pausedRemainingMs when paused, else 0) */
  remainingMs: number;
  start: (durationMs: number) => void;
  pause: () => void;
  resume: () => void;
  reset: () => void;
  stop: () => void;
  setPanelVisible: (visible: boolean) => void;
  /** Preload last duration from storage (call once when provider mounts) */
  loadLastDuration: () => Promise<void>;
};

const RestTimerContext = createContext<RestTimerContextValue | null>(null);

const TICK_MS = 1000;

export function RestTimerProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<RestTimerState>({
    status: "idle",
    endTimeMs: null,
    pausedRemainingMs: null,
    totalDurationMs: 0,
    panelVisible: false,
    lastDurationSec: null,
  });

  const [tick, setTick] = useState(0);
  const finishedFiredRef = useRef(false);

  const loadLastDuration = useCallback(async () => {
    const sec = await getLastRestTimerDurationSec();
    setState((s) => ({ ...s, lastDurationSec: sec }));
  }, []);

  useEffect(() => {
    loadLastDuration();
  }, [loadLastDuration]);

  useEffect(() => {
    if (state.status !== "running") return;
    const id = setInterval(() => setTick((t) => t + 1), TICK_MS);
    return () => clearInterval(id);
  }, [state.status]);

  const remainingMs = useMemo(() => {
    if (state.status === "running" && state.endTimeMs != null) {
      return Math.max(0, state.endTimeMs - Date.now());
    }
    if (state.status === "paused" && state.pausedRemainingMs != null) {
      return state.pausedRemainingMs;
    }
    if (state.status === "finished") return 0;
    return 0;
  }, [state.status, state.endTimeMs, state.pausedRemainingMs, tick]);

  useEffect(() => {
    if (state.status !== "running" || state.endTimeMs == null) return;
    if (remainingMs > 0) {
      finishedFiredRef.current = false;
      return;
    }
    if (finishedFiredRef.current) return;
    finishedFiredRef.current = true;
    playCompletionHaptic();
    setState((s) => ({
      ...s,
      status: "finished",
      endTimeMs: null,
    }));
  }, [state.status, state.endTimeMs, remainingMs]);

  const start = useCallback((durationMs: number) => {
    const sec = Math.round(durationMs / 1000);
    setLastRestTimerDurationSec(sec).catch(() => {
      /* ignore storage errors */
    });
    setState({
      status: "running",
      endTimeMs: Date.now() + durationMs,
      pausedRemainingMs: null,
      totalDurationMs: durationMs,
      panelVisible: true,
      lastDurationSec: sec,
    });
    finishedFiredRef.current = false;
  }, []);

  const pause = useCallback(() => {
    setState((s) => {
      if (s.status !== "running" || s.endTimeMs == null) return s;
      const remaining = Math.max(0, s.endTimeMs - Date.now());
      return {
        ...s,
        status: "paused",
        endTimeMs: null,
        pausedRemainingMs: remaining,
      };
    });
  }, []);

  const resume = useCallback(() => {
    setState((s) => {
      if (s.status !== "paused" || s.pausedRemainingMs == null) return s;
      return {
        ...s,
        status: "running",
        endTimeMs: Date.now() + s.pausedRemainingMs,
        pausedRemainingMs: null,
      };
    });
    finishedFiredRef.current = false;
  }, []);

  const reset = useCallback(() => {
    setState((s) => {
      if (s.status !== "finished" && s.status !== "paused") return s;
      const durationMs = s.totalDurationMs || 60_000;
      return {
        ...s,
        status: "running",
        endTimeMs: Date.now() + durationMs,
        pausedRemainingMs: null,
      };
    });
    finishedFiredRef.current = false;
  }, []);

  const stop = useCallback(() => {
    setState({
      status: "idle",
      endTimeMs: null,
      pausedRemainingMs: null,
      totalDurationMs: 0,
      panelVisible: false,
      lastDurationSec: state.lastDurationSec,
    });
  }, [state.lastDurationSec]);

  const setPanelVisible = useCallback((visible: boolean) => {
    setState((s) => ({ ...s, panelVisible: visible }));
  }, []);

  const value = useMemo<RestTimerContextValue>(
    () => ({
      ...state,
      remainingMs,
      start,
      pause,
      resume,
      reset,
      stop,
      setPanelVisible,
      loadLastDuration,
    }),
    [
      state.status,
      state.endTimeMs,
      state.pausedRemainingMs,
      state.totalDurationMs,
      state.panelVisible,
      state.lastDurationSec,
      remainingMs,
      start,
      pause,
      resume,
      reset,
      stop,
      setPanelVisible,
      loadLastDuration,
    ],
  );

  return (
    <RestTimerContext.Provider value={value}>
      {children}
    </RestTimerContext.Provider>
  );
}

export function useRestTimer(): RestTimerContextValue {
  const ctx = useContext(RestTimerContext);
  if (ctx == null) {
    throw new Error("useRestTimer must be used within RestTimerProvider");
  }
  return ctx;
}
