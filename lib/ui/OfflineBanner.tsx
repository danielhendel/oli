/**
 * Sprint 4 — Offline banner for Timeline & Library.
 *
 * Shown when showing cached content after network failure.
 * Non-intrusive, no prompts/nags.
 */
import React from "react";
import { View, Text, StyleSheet } from "react-native";

export type OfflineBannerProps = {
  /** true when displaying cached content due to network unavailability */
  isOffline?: boolean;
};

export function OfflineBanner({ isOffline }: OfflineBannerProps): React.ReactNode {
  if (!isOffline) return null;

  return (
    <View style={styles.banner}>
      <Text style={styles.text}>Showing cached content. Some data may be outdated.</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  banner: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    backgroundColor: "#F2F2F7",
    borderBottomWidth: 1,
    borderBottomColor: "#E5E5EA",
  },
  text: {
    fontSize: 14,
    color: "#8E8E93",
    textAlign: "center",
  },
});
