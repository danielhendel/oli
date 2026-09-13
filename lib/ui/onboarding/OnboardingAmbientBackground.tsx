// lib/ui/onboarding/OnboardingAmbientBackground.tsx
import React from "react";
import { StyleSheet, View } from "react-native";

import { ONBOARDING_VISUAL } from "./onboardingVisualTokens";

/**
 * Layered atmospheric glow for onboarding — Views only (no new gradient dependency).
 */
export function OnboardingAmbientBackground() {
  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill} accessibilityElementsHidden>
      <View style={[styles.blob, styles.blobTop]} />
      <View style={[styles.blob, styles.blobMid]} />
      <View style={[styles.blob, styles.blobBottom]} />
    </View>
  );
}

const styles = StyleSheet.create({
  blob: {
    position: "absolute",
    borderRadius: 999,
  },
  blobTop: {
    width: 280,
    height: 280,
    top: -80,
    right: -60,
    backgroundColor: ONBOARDING_VISUAL.glowIndigo,
  },
  blobMid: {
    width: 220,
    height: 220,
    top: 180,
    left: -90,
    backgroundColor: ONBOARDING_VISUAL.glowCyan,
  },
  blobBottom: {
    width: 260,
    height: 260,
    bottom: 40,
    right: -40,
    backgroundColor: ONBOARDING_VISUAL.glowViolet,
  },
});
