import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { LoadingState } from "@/lib/ui/ScreenStates";
import { BODY_INDIGO } from "@/lib/ui/body/BodyDayRing";

import { UI_CARD_SURFACE } from "@/lib/ui/theme/uiTokens";
export type BodyAppleHealthPermissionCardProps = {
  variant: "checking" | "connect" | "denied" | "unavailable";
  unavailableMessage?: string;
  onAllowAccess: () => void;
  onOpenSettings: () => void;
};

export function BodyAppleHealthPermissionCard(props: BodyAppleHealthPermissionCardProps) {
  if (props.variant === "checking") {
    return (
      <View style={styles.card}>
        <Text style={styles.title}>Apple Health</Text>
        <LoadingState message="Checking access…" />
      </View>
    );
  }

  if (props.variant === "unavailable") {
    return (
      <View style={styles.card}>
        <Text style={styles.title}>Body data unavailable</Text>
        <Text style={styles.body}>
          {props.unavailableMessage?.trim()
            ? props.unavailableMessage
            : "Apple Health isn’t available on this device. Body Composition needs an iPhone with Health."}
        </Text>
      </View>
    );
  }

  if (props.variant === "connect") {
    return (
      <View style={styles.card}>
        <Text style={styles.title}>Connect Apple Health for Body data</Text>
        <Text style={styles.body}>
          Oli reads Weight, Body Fat, BMI, Lean Body Mass, and resting energy (RMR) from Apple Health. Allow access so your
          Today summary, trends, and history can stay up to date.
        </Text>
        <Pressable
          style={styles.primaryBtn}
          onPress={props.onAllowAccess}
          accessibilityRole="button"
          accessibilityLabel="Allow Apple Health access for body data"
        >
          <Text style={styles.primaryBtnText}>Allow Apple Health Access</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View style={styles.card}>
      <Text style={styles.title}>Apple Health access is off</Text>
      <Text style={styles.body}>
        Body Composition can’t read your measurements while access is turned off. You can enable it in Settings for this app,
        or open the Health app → Sharing → Apps → Oli and turn on the body metrics you want to share.
      </Text>
      <Pressable
        style={styles.primaryBtn}
        onPress={props.onOpenSettings}
        accessibilityRole="button"
        accessibilityLabel="Open Settings to enable Apple Health access"
      >
        <Text style={styles.primaryBtnText}>Open Settings</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: UI_CARD_SURFACE,
    borderRadius: 12,
    padding: 16,
    gap: 12,
  },
  title: {
    fontSize: 17,
    fontWeight: "700",
    color: "#1C1C1E",
  },
  body: {
    fontSize: 15,
    color: "#3C3C43",
    lineHeight: 22,
  },
  primaryBtn: {
    alignSelf: "flex-start",
    marginTop: 4,
    paddingVertical: 12,
    paddingHorizontal: 18,
    backgroundColor: BODY_INDIGO,
    borderRadius: 10,
  },
  primaryBtnText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#FFFFFF",
  },
});
