// lib/ui/onboarding/OpeningScreenContent.tsx
import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { OPENING_COPY } from "@/lib/onboarding/constants";

import { OnboardingAmbientBackground } from "./OnboardingAmbientBackground";
import { onboardingCtaStyles } from "./OnboardingScreenShell";
import { ONBOARDING_VISUAL } from "./onboardingVisualTokens";

export type OpeningScreenContentProps = {
  onGetStarted: () => void;
  onSignIn: () => void;
};

export function OpeningScreenContent({ onGetStarted, onSignIn }: OpeningScreenContentProps) {
  return (
    <SafeAreaView style={styles.safe} edges={["top", "bottom"]} testID="onboarding-opening">
      <OnboardingAmbientBackground />
      <View style={styles.body}>
        <View style={styles.brandMark} accessibilityRole="header">
          <Text style={styles.brand}>{OPENING_COPY.brand}</Text>
        </View>
        <Text style={styles.headline}>{OPENING_COPY.headline}</Text>
        <View style={styles.lines}>
          {OPENING_COPY.lines.map((line) => (
            <Text key={line} style={styles.line}>
              {line}
            </Text>
          ))}
        </View>
      </View>
      <View style={styles.footer}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={OPENING_COPY.primaryCta}
          onPress={onGetStarted}
          style={onboardingCtaStyles.primary}
        >
          <Text style={onboardingCtaStyles.primaryLabel}>{OPENING_COPY.primaryCta}</Text>
        </Pressable>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={OPENING_COPY.secondaryCta}
          onPress={onSignIn}
          style={onboardingCtaStyles.secondary}
        >
          <Text style={onboardingCtaStyles.secondaryLabel}>{OPENING_COPY.secondaryCta}</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: ONBOARDING_VISUAL.canvas,
  },
  body: {
    flex: 1,
    justifyContent: "center",
    paddingHorizontal: 24,
    zIndex: 1,
  },
  brandMark: {
    alignSelf: "flex-start",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: ONBOARDING_VISUAL.accentWash,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "rgba(58,91,219,0.45)",
    marginBottom: 22,
  },
  brand: {
    color: ONBOARDING_VISUAL.textPrimary,
    fontSize: 13,
    fontWeight: "800",
    letterSpacing: 2.4,
  },
  headline: {
    color: ONBOARDING_VISUAL.textPrimary,
    fontSize: 36,
    fontWeight: "800",
    letterSpacing: -0.6,
    lineHeight: 42,
    marginBottom: 22,
  },
  lines: { gap: 12 },
  line: {
    color: ONBOARDING_VISUAL.textSecondary,
    fontSize: 18,
    lineHeight: 28,
    fontWeight: "500",
  },
  footer: {
    paddingHorizontal: 20,
    paddingBottom: 16,
    gap: 10,
    zIndex: 1,
  },
});
