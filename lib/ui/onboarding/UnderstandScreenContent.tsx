// lib/ui/onboarding/UnderstandScreenContent.tsx
import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { UNDERSTAND_COPY } from "@/lib/onboarding/constants";
import type { DataReadinessViewModel } from "@/lib/onboarding/types";
import {
  UI_BORDER_HAIRLINE,
  UI_CARD_SURFACE,
  UI_TEXT_MUTED,
  UI_TEXT_PRIMARY,
  UI_TEXT_SECONDARY,
} from "@/lib/ui/theme/uiTokens";

import { OnboardingScreenShell, onboardingCtaStyles } from "./OnboardingScreenShell";

export type UnderstandScreenContentProps = {
  viewModel: DataReadinessViewModel;
  completing: boolean;
  bannerError: string | null;
  onComplete: () => void;
};

export function UnderstandScreenContent({
  viewModel,
  completing,
  bannerError,
  onComplete,
}: UnderstandScreenContentProps) {
  return (
    <OnboardingScreenShell
      title={viewModel.title || UNDERSTAND_COPY.title}
      subtitle={viewModel.subtitle || UNDERSTAND_COPY.subtitle}
      stepIndex={3}
      footer={
        <>
          {bannerError ? <Text style={onboardingCtaStyles.error}>{bannerError}</Text> : null}
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={UNDERSTAND_COPY.continueCta}
            disabled={completing}
            onPress={onComplete}
            style={[onboardingCtaStyles.primary, completing ? onboardingCtaStyles.primaryDisabled : null]}
          >
            <Text style={onboardingCtaStyles.primaryLabel}>
              {completing ? "Finishing…" : UNDERSTAND_COPY.continueCta}
            </Text>
          </Pressable>
        </>
      }
    >
      <View style={styles.list}>
        {viewModel.signals.map((s) => (
          <View key={s.id} style={styles.row}>
            <View style={styles.rowTop}>
              <Text style={styles.rowLabel}>{s.label}</Text>
              <Text
                style={[
                  styles.badge,
                  s.state === "present"
                    ? styles.badgePresent
                    : s.state === "unavailable"
                      ? styles.badgeUnavailable
                      : styles.badgeMissing,
                ]}
              >
                {s.state === "present" ? "Present" : s.state === "unavailable" ? "Unavailable" : "Missing"}
              </Text>
            </View>
            <Text style={styles.rowDetail}>{s.detail}</Text>
          </View>
        ))}
      </View>
    </OnboardingScreenShell>
  );
}

const styles = StyleSheet.create({
  list: { gap: 10 },
  row: {
    backgroundColor: UI_CARD_SURFACE,
    borderRadius: 14,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: UI_BORDER_HAIRLINE,
    padding: 14,
  },
  rowTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 6,
  },
  rowLabel: {
    color: UI_TEXT_PRIMARY,
    fontWeight: "700",
    fontSize: 16,
  },
  badge: {
    fontSize: 12,
    fontWeight: "700",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    overflow: "hidden",
  },
  badgePresent: {
    color: "#9BE7B0",
    backgroundColor: "rgba(80,180,120,0.18)",
  },
  badgeMissing: {
    color: UI_TEXT_MUTED,
    backgroundColor: "rgba(255,255,255,0.06)",
  },
  badgeUnavailable: {
    color: UI_TEXT_SECONDARY,
    backgroundColor: "rgba(255,255,255,0.08)",
  },
  rowDetail: {
    color: UI_TEXT_SECONDARY,
    fontSize: 13,
    lineHeight: 18,
  },
});
