// components/failures/FailureList.tsx
import React from "react";
import { View, Text, StyleSheet } from "react-native";
import type { FailureListItemDto } from "@/lib/contracts/failure";
import { FailureCard } from "@/components/failures/FailureCard";

export type FailureListProps = {
  items: FailureListItemDto[];
  truncated?: boolean;
};

export function FailureList({ items, truncated = false }: FailureListProps) {
  if (!items.length) {
    return (
      <View style={styles.empty}>
        <Text style={styles.emptyTitle}>No failures recorded</Text>
        <Text style={styles.emptyText}>
          This means no failed, rejected, or missing data has been written to failure memory.
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.list}>
      {truncated ? (
        <View style={styles.truncated}>
          <Text style={styles.truncatedTitle}>More failures exist</Text>
          <Text style={styles.truncatedText}>
            Not all failures are loaded on this device. Failure memory remains intact.
          </Text>
        </View>
      ) : null}

      {items.map((item) => (
        <FailureCard key={item.id} item={item} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  list: {
    gap: 12,
  },
  empty: {
    backgroundColor: "#F2F2F7",
    borderRadius: 16,
    padding: 14,
    gap: 6,
  },
  emptyTitle: {
    fontSize: 14,
    fontWeight: "800",
  },
  emptyText: {
    fontSize: 13,
    opacity: 0.75,
  },
  truncated: {
    backgroundColor: "#FFF5E6",
    borderRadius: 16,
    padding: 14,
    gap: 6,
  },
  truncatedTitle: {
    fontSize: 14,
    fontWeight: "800",
    color: "#7A4E00",
  },
  truncatedText: {
    fontSize: 13,
    color: "#333",
  },
});
