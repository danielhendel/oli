// lib/ui/onboarding/OpeningScreenContent.tsx
import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { OPENING_COPY } from "@/lib/onboarding/constants";
import {
  UI_APP_SCREEN_BG,
  UI_TEXT_MUTED,
  UI_TEXT_PRIMARY,
  UI_TEXT_SECONDARY,
} from "@/lib/ui/theme/uiTokens";

import { onboardingCtaStyles } from "./OnboardingScreenShell";

export type OpeningScreenContentProps = {
  onGetStarted: () => void;
  onSignIn: () => void;
};

export function OpeningScreenContent({ onGetStarted, onSignIn }: OpeningScreenContentProps) {
  return (
    <SafeAreaView style={styles.safe} edges={["top", "bottom"]} testID="onboarding-opening">
      <View style={styles.body}>
        <Text style={styles.brand}>{OPENING_COPY.brand}</Text>
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
    backgroundColor: UI_APP_SCREEN_BG,
  },
  body: {
    flex: 1,
    justifyContent: "center",
    paddingHorizontal: 24,
  },
  brand: {
    color: UI_TEXT_MUTED,
    fontSize: 18,
    fontWeight: "700",
    letterSpacing: 1.2,
    marginBottom: 16,
    textTransform: "uppercase",
  },
  headline: {
    color: UI_TEXT_PRIMARY,
    fontSize: 36,
    fontWeight: "800",
    marginBottom: 20,
  },
  lines: { gap: 10 },
  line: {
    color: UI_TEXT_SECONDARY,
    fontSize: 18,
    lineHeight: 26,
  },
  footer: {
    paddingHorizontal: 20,
    paddingBottom: 16,
    gap: 8,
  },
});
