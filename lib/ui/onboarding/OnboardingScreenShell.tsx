// lib/ui/onboarding/OnboardingScreenShell.tsx
import React from "react";
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { OnboardingAmbientBackground } from "./OnboardingAmbientBackground";
import { OnboardingOwnershipMenu } from "./OnboardingOwnershipMenu";
import { OnboardingStepIndicator } from "./OnboardingStepIndicator";
import { ONBOARDING_VISUAL } from "./onboardingVisualTokens";

export type OnboardingScreenShellProps = {
  title?: string;
  subtitle?: string;
  stepIndex?: number;
  stepCount?: number;
  showOwnershipMenu?: boolean;
  children: React.ReactNode;
  footer?: React.ReactNode;
};

export function OnboardingScreenShell({
  title,
  subtitle,
  stepIndex,
  stepCount = 3,
  showOwnershipMenu = true,
  children,
  footer,
}: OnboardingScreenShellProps) {
  return (
    <SafeAreaView style={styles.safe} edges={["top", "bottom"]}>
      <OnboardingAmbientBackground />
      <View style={styles.topRow}>
        {typeof stepIndex === "number" ? (
          <OnboardingStepIndicator stepIndex={stepIndex} stepCount={stepCount} />
        ) : (
          <View style={styles.topSpacer} />
        )}
        {showOwnershipMenu ? <OnboardingOwnershipMenu /> : <View />}
      </View>

      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        keyboardVerticalOffset={8}
      >
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
        >
          {title ? (
            <Text style={styles.title} accessibilityRole="header">
              {title}
            </Text>
          ) : null}
          {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
          {children}
        </ScrollView>

        {footer ? <View style={styles.footer}>{footer}</View> : null}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: ONBOARDING_VISUAL.canvas,
  },
  flex: { flex: 1 },
  topRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingTop: 4,
    gap: 12,
    zIndex: 1,
  },
  topSpacer: { flex: 1, minHeight: 44 },
  scroll: { flex: 1, zIndex: 1 },
  content: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 28,
  },
  title: {
    color: ONBOARDING_VISUAL.textPrimary,
    fontSize: 30,
    fontWeight: "800",
    letterSpacing: -0.4,
    marginBottom: 10,
  },
  subtitle: {
    color: ONBOARDING_VISUAL.textSecondary,
    fontSize: 16,
    lineHeight: 24,
    marginBottom: 24,
  },
  footer: {
    paddingHorizontal: 20,
    paddingBottom: 12,
    gap: 10,
    zIndex: 1,
  },
});

export const onboardingCtaStyles = StyleSheet.create({
  primary: {
    minHeight: ONBOARDING_VISUAL.minTap,
    borderRadius: ONBOARDING_VISUAL.radiusMd,
    backgroundColor: ONBOARDING_VISUAL.primaryButton,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 16,
    shadowColor: ONBOARDING_VISUAL.accent,
    shadowOpacity: 0.35,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
  },
  primaryDisabled: {
    opacity: 0.45,
  },
  primaryLabel: {
    color: "#fff",
    fontWeight: "700",
    fontSize: 16,
  },
  secondary: {
    minHeight: ONBOARDING_VISUAL.minTap,
    borderRadius: ONBOARDING_VISUAL.radiusMd,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 16,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: ONBOARDING_VISUAL.secondaryBorder,
    backgroundColor: "rgba(255,255,255,0.04)",
  },
  secondaryLabel: {
    color: ONBOARDING_VISUAL.textPrimary,
    fontWeight: "600",
    fontSize: 15,
  },
  error: {
    color: "#FF6B6B",
    fontSize: 14,
    marginBottom: 8,
  },
  muted: {
    color: ONBOARDING_VISUAL.textMuted,
    fontSize: 13,
  },
});
