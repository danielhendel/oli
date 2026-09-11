// lib/ui/onboarding/ConnectSourcesScreenContent.tsx
import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { CONNECT_COPY } from "@/lib/onboarding/constants";
import type { ConnectSourceCardState } from "@/lib/onboarding/types";
import {
  UI_BORDER_HAIRLINE,
  UI_CARD_SURFACE,
  UI_TEXT_MUTED,
  UI_TEXT_PRIMARY,
  UI_TEXT_SECONDARY,
} from "@/lib/ui/theme/uiTokens";

import { OnboardingScreenShell, onboardingCtaStyles } from "./OnboardingScreenShell";

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
          {bannerError ? <Text style={onboardingCtaStyles.error}>{bannerError}</Text> : null}
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
            style={onboardingCtaStyles.secondary}
          >
            <Text style={onboardingCtaStyles.secondaryLabel}>{CONNECT_COPY.laterCta}</Text>
          </Pressable>
        </>
      }
    >
      <SourceCard
        title="Apple Health"
        description="Workouts, steps, activity, sleep, and body metrics from iPhone and Apple Watch. Connection is separate from device permission — sync starts only when you Connect."
        state={apple}
        onConnect={onConnectApple}
      />
      <SourceCard
        title="Oura"
        description="Sleep and HRV from your Oura account."
        state={oura}
        onConnect={onConnectOura}
      />
    </OnboardingScreenShell>
  );
}

function SourceCard({
  title,
  description,
  state,
  onConnect,
}: {
  title: string;
  description: string;
  state: ConnectSourceCardState;
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

  const canConnect =
    state.status === "idle" || state.status === "error";

  return (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <Text style={styles.cardTitle}>{title}</Text>
        <Text style={styles.cardStatus}>{statusLabel}</Text>
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
    backgroundColor: UI_CARD_SURFACE,
    borderRadius: 16,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: UI_BORDER_HAIRLINE,
    padding: 16,
    marginBottom: 14,
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  cardTitle: {
    color: UI_TEXT_PRIMARY,
    fontSize: 17,
    fontWeight: "700",
  },
  cardStatus: {
    color: UI_TEXT_MUTED,
    fontSize: 13,
    fontWeight: "600",
  },
  cardBody: {
    color: UI_TEXT_SECONDARY,
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 12,
  },
  cardHint: {
    color: UI_TEXT_MUTED,
    fontSize: 13,
    marginBottom: 8,
  },
  cardError: {
    color: "#FF6B6B",
    fontSize: 13,
    marginBottom: 8,
  },
  connectBtn: {
    minHeight: 44,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(58,91,219,0.22)",
  },
  connectBtnLabel: {
    color: UI_TEXT_PRIMARY,
    fontWeight: "700",
    fontSize: 15,
  },
});
