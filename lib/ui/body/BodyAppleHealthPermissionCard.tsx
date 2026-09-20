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
      <View style={styles.card} testID="body-apple-health-permission-card">
        <Text style={styles.title}>Connect Apple Health</Text>
        <Text style={styles.body}>
          Apple Health can transport Body measurements from manual entry, scales, or other apps. The underlying measurement
          method may not always be available. Allow access only when you are ready.
        </Text>
        <Pressable
          style={styles.primaryBtn}
          onPress={props.onAllowAccess}
          accessibilityRole="button"
          accessibilityLabel="Allow Apple Health access for body data"
        >
          <Text style={styles.primaryBtnText}>Connect Apple Health</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View style={styles.card} testID="body-apple-health-permission-card">
      <Text style={styles.title}>Review Apple Health access</Text>
      <Text style={styles.body}>
        Apple Health access is turned off for Body measurements. Enable it in Settings for this app, or open the Health app →
        Sharing → Apps → Oli and turn on the body metrics you want to share. Apple Health is a transport layer, not a
        measurement method.
      </Text>
      <Pressable
        style={styles.primaryBtn}
        onPress={props.onOpenSettings}
        accessibilityRole="button"
        accessibilityLabel="Open Settings to enable Apple Health access"
      >
        <Text style={styles.primaryBtnText}>Review Apple Health access</Text>
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
