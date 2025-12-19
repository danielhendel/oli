import React from "react";
import { View, Text, StyleSheet } from "react-native";

export type ModuleSectionCardProps = {
  title: string;
  description?: string;
  rightBadge?: string; // e.g. "Coming soon"
  children?: React.ReactNode;
};

export function ModuleSectionCard({ title, description, rightBadge, children }: ModuleSectionCardProps) {
  return (
    <View style={styles.card}>
      <View style={styles.headerRow}>
        <Text style={styles.title}>{title}</Text>
        {rightBadge ? (
          <View style={styles.badge}>
            <Text style={styles.badgeText}>{rightBadge}</Text>
          </View>
        ) : null}
      </View>

      {description ? <Text style={styles.description}>{description}</Text> : null}

      {children ? <View style={styles.content}>{children}</View> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: "#F2F2F7",
    borderRadius: 16,
    padding: 16,
    gap: 10,
  },
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: 10,
  },
  title: {
    fontSize: 16,
    fontWeight: "800",
  },
  description: {
    fontSize: 14,
    opacity: 0.75,
  },
  content: {
    gap: 10,
  },
  badge: {
    backgroundColor: "#E5E5EA",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
  },
  badgeText: {
    fontSize: 12,
    fontWeight: "700",
    opacity: 0.9,
  },
});
