import React from "react";
import { View, Text, StyleSheet } from "react-native";

import { LinearProgressBar } from "@/lib/ui/primitives/LinearProgressBar";

export type ContributorRowProps = {
  label: string;
  valueDisplay: string;
  progress: number;
  rating: string;
};

type Props = {
  title?: string;
  rows: ContributorRowProps[];
};

export function RecoveryContributorsCard({ title = "Contributors", rows }: Props) {
  return (
    <View style={styles.card}>
      <Text style={styles.title}>{title}</Text>
      <View style={styles.list}>
        {rows.map((row) => (
          <View key={row.label} style={styles.row}>
            <View style={styles.line1}>
              <Text style={styles.label}>{row.label}</Text>
              <Text style={styles.value}>{row.valueDisplay}</Text>
            </View>
            <LinearProgressBar
              progress={row.progress}
              height={6}
              borderRadius={3}
              trackColor="#E5E5EA"
              fillColor="#1C1C1E"
            />
            <Text style={styles.rating}>{row.rating}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    paddingVertical: 20,
    paddingHorizontal: 20,
  },
  title: {
    fontSize: 17,
    fontWeight: "700",
    color: "#1C1C1E",
    marginBottom: 16,
  },
  list: {
    gap: 16,
  },
  row: {
    gap: 6,
  },
  line1: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  label: {
    fontSize: 15,
    color: "#1C1C1E",
  },
  value: {
    fontSize: 15,
    fontWeight: "600",
    color: "#1C1C1E",
  },
  rating: {
    fontSize: 13,
    color: "#6E6E73",
  },
});

