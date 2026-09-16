// lib/ui/onboarding/ConnectSourcesScreenContent.tsx
import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { CONNECT_COPY } from "@/lib/onboarding/constants";
import type { ConnectSourceCardState } from "@/lib/onboarding/types";

import { OnboardingScreenShell, onboardingCtaStyles } from "./OnboardingScreenShell";
import { ONBOARDING_VISUAL } from "./onboardingVisualTokens";

export type ConnectSourcesScreenContentProps = {
  apple: ConnectSourceCardState;
  oura: ConnectSourceCardState;
  advancing: boolean;
  bannerError: string | null;
  onConnectApple: () => void;
  onConnectOura: () => void;
  onContinue: () => void;
  onLater: () => void;
};

export function ConnectSourcesScreenContent({
  apple,
  oura,
  advancing,
  bannerError,
  onConnectApple,
  onConnectOura,
  onContinue,
  onLater,
}: ConnectSourcesScreenContentProps) {
  return (
    <OnboardingScreenShell
      title={CONNECT_COPY.title}
      subtitle={CONNECT_COPY.subtitle}
      stepIndex={2}
      footer={
        <>
          {bannerError ? (
            <Text style={onboardingCtaStyles.error} accessibilityLiveRegion="polite">
              {bannerError}
            </Text>
          ) : null}
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={CONNECT_COPY.continueCta}
            disabled={advancing}
            onPress={onContinue}
            style={[onboardingCtaStyles.primary, advancing ? onboardingCtaStyles.primaryDisabled : null]}
          >
            <Text style={onboardingCtaStyles.primaryLabel}>
              {advancing ? "Continuing…" : CONNECT_COPY.continueCta}
            </Text>
          </Pressable>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={CONNECT_COPY.laterCta}
            disabled={advancing}
            onPress={onLater}
            style={[onboardingCtaStyles.secondary, advancing ? onboardingCtaStyles.primaryDisabled : null]}
            testID="onboarding-connect-later"
          >
            <Text style={onboardingCtaStyles.secondaryLabel}>{CONNECT_COPY.laterCta}</Text>
          </Pressable>
        </>
      }
    >
      <SourceCard
        title="Apple Health"
        description="Workouts, steps, activity, sleep, and body metrics from iPhone and Apple Watch. Sync starts only when you Connect for this account."
        state={apple}
        accent="apple"
        onConnect={onConnectApple}
      />
      <SourceCard
        title="Oura"
        description="Sleep and HRV from your Oura account."
        state={oura}
        accent="oura"
        onConnect={onConnectOura}
      />
    </OnboardingScreenShell>
  );
}

function SourceCard({
  title,
  description,
  state,
  accent,
  onConnect,
}: {
  title: string;
  description: string;
  state: ConnectSourceCardState;
  accent: "apple" | "oura";
  onConnect: () => void;
}) {
  const statusLabel =
    state.status === "connected"
      ? "Connected"
      : state.status === "connecting"
        ? "Connecting…"
        : state.status === "unavailable"
          ? "Unavailable"
          : state.status === "error"
            ? "Try again"
            : "Not connected";

  const canConnect = state.status === "idle" || state.status === "error";
  const accentFill = accent === "apple" ? ONBOARDING_VISUAL.appleAccent : ONBOARDING_VISUAL.ouraAccent;
  const accentBorder =
    accent === "apple" ? ONBOARDING_VISUAL.appleAccentBorder : ONBOARDING_VISUAL.ouraAccentBorder;

  return (
    <View
      style={[styles.card, { borderColor: accentBorder }]}
      accessibilityLabel={`${title}, ${statusLabel}`}
    >
      <View style={styles.cardHeader}>
        <View style={[styles.iconBadge, { backgroundColor: accentFill }]}>
          <Text style={styles.iconGlyph}>{accent === "apple" ? "AH" : "Ou"}</Text>
        </View>
        <View style={styles.cardTitles}>
          <Text style={styles.cardTitle}>{title}</Text>
          <Text
            style={[
              styles.statusPill,
              state.status === "connected" ? styles.statusConnected : null,
            ]}
          >
            {statusLabel}
          </Text>
        </View>
      </View>
      <Text style={styles.cardBody}>{description}</Text>
      {state.status === "unavailable" ? (
        <Text style={styles.cardHint}>{state.reason}</Text>
      ) : null}
      {state.status === "error" ? <Text style={styles.cardError}>{state.message}</Text> : null}
      {canConnect ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`Connect ${title}`}
          onPress={onConnect}
          style={styles.connectBtn}
        >
          <Text style={styles.connectBtnLabel}>Connect</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: "rgba(255,255,255,0.04)",
    borderRadius: ONBOARDING_VISUAL.radiusLg,
    borderWidth: StyleSheet.hairlineWidth,
    padding: 16,
    marginBottom: 14,
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginBottom: 10,
  },
  iconBadge: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  iconGlyph: {
    color: ONBOARDING_VISUAL.textPrimary,
    fontWeight: "800",
    fontSize: 13,
    letterSpacing: 0.4,
  },
  cardTitles: {
    flex: 1,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 8,
  },
  cardTitle: {
    color: ONBOARDING_VISUAL.textPrimary,
    fontSize: 17,
    fontWeight: "700",
    flexShrink: 1,
  },
  statusPill: {
    color: ONBOARDING_VISUAL.textMuted,
    fontSize: 12,
    fontWeight: "700",
    overflow: "hidden",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
    backgroundColor: "rgba(255,255,255,0.06)",
  },
  statusConnected: {
    color: "#9BE7B0",
    backgroundColor: "rgba(80,180,120,0.18)",
  },
  cardBody: {
    color: ONBOARDING_VISUAL.textSecondary,
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 12,
  },
  cardHint: {
    color: ONBOARDING_VISUAL.textMuted,
    fontSize: 13,
    marginBottom: 8,
  },
  cardError: {
    color: "#FF6B6B",
    fontSize: 13,
    marginBottom: 8,
  },
  connectBtn: {
    minHeight: ONBOARDING_VISUAL.minTap,
    borderRadius: ONBOARDING_VISUAL.radiusSm,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: ONBOARDING_VISUAL.accentWash,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "rgba(58,91,219,0.4)",
  },
  connectBtnLabel: {
    color: ONBOARDING_VISUAL.textPrimary,
    fontWeight: "700",
    fontSize: 15,
  },
});
