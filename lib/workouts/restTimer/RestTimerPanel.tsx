/**
 * Global rest timer panel — drops from top. Dismiss: tap outside, swipe up, or tap timer icon again.
 * Presets only: 30s, 45s, 60s, 90s, 2m. Tapping a preset starts the timer immediately.
 */

import React, { useMemo } from "react";
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  PanResponder,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRestTimer } from "./RestTimerContext";
import { SYSTEM_ACCENT } from "@/lib/ui/theme/systemAccent";

/** Preset durations in seconds; 2m = 120 */
const PRESETS_SEC = [30, 45, 60, 90, 120];

function presetLabel(sec: number): string {
  return sec === 120 ? "2m" : `${sec}s`;
}

/** Timer-active green (same as metricVolume); last-5-sec red (metricStrength). */
const timerActiveGreen = "#34C759";
const timerWarningRed = "#FF3B30";

function formatRemaining(remainingMs: number): string {
  const totalSec = Math.max(0, Math.ceil(remainingMs / 1000));
  const m = Math.floor(totalSec / 60);
  const s = totalSec % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}

export function RestTimerPanel() {
  const insets = useSafeAreaInsets();
  const {
    status,
    remainingMs,
    panelVisible,
    lastDurationSec,
    start,
    pause,
    resume,
    reset,
    stop,
    setPanelVisible,
  } = useRestTimer();

  const pan = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => false,
        onMoveShouldSetPanResponder: (_, g) => g.dy < -8,
        onPanResponderRelease: (_, g) => {
          if (g.dy < -35) setPanelVisible(false);
        },
      }),
    [setPanelVisible],
  );

  const showBar =
    (status === "running" || status === "paused") && !panelVisible;
  const showPanel = panelVisible || status === "finished";

  const handlePresetPress = (sec: number) => {
    start(sec * 1000);
  };

  const isLastUsedPreset = (sec: number) =>
    lastDurationSec != null && lastDurationSec === sec;

  if (status === "idle" && !panelVisible) return null;

  return (
    <View style={[styles.overlay, { paddingTop: insets.top }]} pointerEvents="box-none">
      {/* Tap-outside backdrop when panel is expanded */}
      {showPanel && (
        <Pressable
          style={styles.backdrop}
          onPress={() => setPanelVisible(false)}
          accessibilityRole="button"
          accessibilityLabel="Close timer"
        />
      )}
      {/* Collapsed bar: tap to expand */}
      {showBar && (
        <Pressable
          style={styles.bar}
          onPress={() => setPanelVisible(true)}
          accessibilityRole="button"
          accessibilityLabel={`Rest timer ${formatRemaining(remainingMs)}. Tap to open.`}
        >
          <Text style={styles.barIcon}>⏱</Text>
          <Text style={styles.barText}>
            {status === "paused" ? "Paused " : ""}
            {formatRemaining(remainingMs)}
          </Text>
        </Pressable>
      )}

      {/* Expanded panel — whole panel is swipe-up to dismiss */}
      {showPanel && (
        <View style={styles.panel} {...pan.panHandlers}>
          <View style={styles.grabberWrap}>
            <View style={styles.grabber} />
          </View>

          {status === "idle" && (
            <View style={styles.presetGrid}>
              {PRESETS_SEC.map((sec) => (
                <Pressable
                  key={sec}
                  style={[styles.presetBtn, isLastUsedPreset(sec) && styles.presetBtnHighlight]}
                  onPress={() => handlePresetPress(sec)}
                  accessibilityRole="button"
                  accessibilityLabel={sec === 120 ? "2 minutes" : `${sec} seconds`}
                >
                  <Text
                    style={[
                      styles.presetBtnText,
                      isLastUsedPreset(sec) && styles.presetBtnTextHighlight,
                    ]}
                  >
                    {presetLabel(sec)}
                  </Text>
                </Pressable>
              ))}
            </View>
          )}

          {(status === "running" || status === "paused" || status === "finished") && (
            <>
              <View style={styles.activeRow}>
                <View style={styles.activeLeft}>
                  {status === "running" && (
                    <Pressable
                      style={styles.activeBtn}
                      onPress={pause}
                      accessibilityRole="button"
                      accessibilityLabel="Pause"
                    >
                      <Text style={styles.activeBtnText}>Pause</Text>
                    </Pressable>
                  )}
                  {status === "paused" && (
                    <Pressable
                      style={styles.activeBtn}
                      onPress={resume}
                      accessibilityRole="button"
                      accessibilityLabel="Resume"
                    >
                      <Text style={styles.activeBtnText}>Resume</Text>
                    </Pressable>
                  )}
                  {status === "finished" && (
                    <Pressable
                      style={styles.activeBtn}
                      onPress={reset}
                      accessibilityRole="button"
                      accessibilityLabel="Restart same duration"
                    >
                      <Text style={styles.activeBtnText}>Restart</Text>
                    </Pressable>
                  )}
                </View>
                <View style={styles.activeCenter}>
                  <Text
                    style={[
                      styles.activeTime,
                      status === "running" && remainingMs <= 5000 && styles.activeTimeWarning,
                      status === "running" && remainingMs > 5000 && styles.activeTimeActive,
                      (status === "paused" || status === "finished") && styles.activeTimeNeutral,
                    ]}
                  >
                    {status === "finished" ? "0:00" : formatRemaining(remainingMs)}
                  </Text>
                </View>
                <View style={styles.activeRight}>
                  {status === "paused" && (
                    <Pressable
                      style={styles.activeBtn}
                      onPress={reset}
                      accessibilityRole="button"
                      accessibilityLabel="Reset"
                    >
                      <Text style={styles.activeBtnText}>Reset</Text>
                    </Pressable>
                  )}
                  <Pressable
                    style={[styles.activeBtn, styles.activeBtnSecondary]}
                    onPress={stop}
                    accessibilityRole="button"
                    accessibilityLabel="Stop"
                  >
                    <Text style={styles.activeBtnTextSecondary}>Stop</Text>
                  </Pressable>
                </View>
              </View>
              {status === "running" && (
                <Pressable
                  style={styles.dismissHint}
                  onPress={() => setPanelVisible(false)}
                  accessibilityLabel="Swipe up to dismiss"
                >
                  <Text style={styles.dismissHintText}>Swipe up to dismiss</Text>
                </Pressable>
              )}
            </>
          )}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 9999,
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.2)",
  },
  bar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    height: 44,
    backgroundColor: "#1C1C1E",
    paddingHorizontal: 16,
    gap: 8,
  },
  barIcon: { fontSize: 18 },
  barText: { fontSize: 16, fontWeight: "700", color: "#FFFFFF" },
  panel: {
    backgroundColor: "#FFFFFF",
    borderBottomLeftRadius: 12,
    borderBottomRightRadius: 12,
    paddingHorizontal: 20,
    paddingBottom: 24,
    borderWidth: StyleSheet.hairlineWidth,
    borderTopWidth: 0,
    borderColor: "#E5E5EA",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 4,
  },
  grabberWrap: {
    alignItems: "center",
    paddingVertical: 10,
  },
  grabber: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: "#C7C7CC",
  },
  presetGrid: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 4,
  },
  presetBtn: {
    flex: 1,
    marginHorizontal: 4,
    minHeight: 44,
    paddingVertical: 12,
    backgroundColor: "#F2F2F7",
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  presetBtnHighlight: {
    backgroundColor: "#E8F5E9",
    borderWidth: 2,
    borderColor: "#34C759",
  },
  presetBtnText: { fontSize: 15, fontWeight: "700", color: "#1C1C1E" },
  presetBtnTextHighlight: { color: "#2E7D32" },
  activeRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 12,
    paddingHorizontal: 4,
    minHeight: 56,
  },
  activeLeft: {
    minWidth: 72,
    alignItems: "flex-start",
  },
  activeCenter: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  activeRight: {
    minWidth: 72,
    flexDirection: "row",
    gap: 8,
    alignItems: "center",
    justifyContent: "flex-end",
  },
  activeTime: {
    fontSize: 28,
    fontWeight: "800",
  },
  activeTimeActive: { color: timerActiveGreen },
  activeTimeWarning: { color: timerWarningRed },
  activeTimeNeutral: { color: "#1C1C1E" },
  activeBtn: {
    paddingVertical: 10,
    paddingHorizontal: 14,
    backgroundColor: SYSTEM_ACCENT,
    borderRadius: 10,
  },
  activeBtnSecondary: {
    backgroundColor: "transparent",
    borderWidth: 1,
    borderColor: "#C7C7CC",
  },
  activeBtnText: { fontSize: 15, fontWeight: "700", color: "#FFFFFF" },
  activeBtnTextSecondary: { fontSize: 15, fontWeight: "600", color: "#6E6E73" },
  dismissHint: { marginTop: 8, alignItems: "center" },
  dismissHintText: { fontSize: 13, color: "#8E8E93" },
});
