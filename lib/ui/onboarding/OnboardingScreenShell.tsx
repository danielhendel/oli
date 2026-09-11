// lib/ui/onboarding/OnboardingScreenShell.tsx
import React from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import {
  UI_APP_SCREEN_BG,
  UI_TEXT_MUTED,
  UI_TEXT_PRIMARY,
  UI_TEXT_SECONDARY,
} from "@/lib/ui/theme/uiTokens";

import { OnboardingOwnershipMenu } from "./OnboardingOwnershipMenu";

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
      <View style={styles.topRow}>
        {typeof stepIndex === "number" ? (
          <View style={styles.progressRow} accessibilityLabel={`Step ${stepIndex} of ${stepCount}`}>
            {Array.from({ length: stepCount }).map((_, i) => (
              <View
                key={i}
                style={[styles.progressDot, i + 1 <= stepIndex ? styles.progressDotActive : null]}
              />
            ))}
          </View>
        ) : (
          <View />
        )}
        {showOwnershipMenu ? <OnboardingOwnershipMenu /> : <View />}
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
      >
        {title ? <Text style={styles.title}>{title}</Text> : null}
        {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
        {children}
      </ScrollView>

      {footer ? <View style={styles.footer}>{footer}</View> : null}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: UI_APP_SCREEN_BG,
  },
  topRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingTop: 8,
    minHeight: 44,
  },
  progressRow: {
    flexDirection: "row",
    gap: 8,
  },
  progressDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "rgba(255,255,255,0.18)",
  },
  progressDotActive: {
    backgroundColor: UI_TEXT_PRIMARY,
  },
  scroll: { flex: 1 },
  content: {
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 24,
  },
  title: {
    color: UI_TEXT_PRIMARY,
    fontSize: 28,
    fontWeight: "700",
    marginBottom: 8,
  },
  subtitle: {
    color: UI_TEXT_SECONDARY,
    fontSize: 16,
    lineHeight: 22,
    marginBottom: 24,
  },
  footer: {
    paddingHorizontal: 20,
    paddingBottom: 12,
    gap: 10,
  },
});

export const onboardingCtaStyles = StyleSheet.create({
  primary: {
    minHeight: 44,
    borderRadius: 12,
    backgroundColor: "#3A5BDB",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 16,
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
    minHeight: 44,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 16,
  },
  secondaryLabel: {
    color: UI_TEXT_SECONDARY,
    fontWeight: "600",
    fontSize: 15,
  },
  error: {
    color: "#FF6B6B",
    fontSize: 14,
    marginBottom: 8,
  },
  muted: {
    color: UI_TEXT_MUTED,
    fontSize: 13,
  },
});
