// components/setup/SetupList.tsx
import React, { ReactNode } from "react";
import { View, StyleSheet, Pressable } from "react-native";
import Card from "../../lib/ui/Card";
import { Text } from "../../lib/ui/Text";

export type SetupCategory = "workout" | "cardio" | "nutrition" | "recovery";

type Props = {
  category: SetupCategory;
  onManual: () => void;
  onTemplates: () => void;
  onPast: () => void;
  onImport?: () => void; // optional future: marketplace/library
};

function Title({ children }: { children: ReactNode }) {
  return (
    <Text size="xl" weight="bold" style={{ marginBottom: 12 }}>
      {children}
    </Text>
  );
}

function Item({
  title,
  subtitle,
  onPress,
}: {
  title: string;
  subtitle: string;
  onPress: () => void;
}) {
  return (
    <Pressable accessibilityRole="button" onPress={onPress}>
      <Card variant="elevated" radius="lg" padding="md">
        <Text weight="medium">{title}</Text>
        <Text tone="muted" style={{ marginTop: 4 }}>
          {subtitle}
        </Text>
      </Card>
    </Pressable>
  );
}

export default function SetupList({
  category,
  onManual,
  onTemplates,
  onPast,
  onImport,
}: Props) {
  const pretty =
    category === "workout"
      ? "Workout"
      : category === "cardio"
      ? "Cardio"
      : category === "nutrition"
      ? "Nutrition"
      : "Recovery";

  return (
    <View style={styles.wrap} accessibilityLabel={`${pretty} setup options`}>
      <Title>{`${pretty} • Setup`}</Title>

      <Item
        title="Manual log"
        subtitle="Build a log from scratch with full control."
        onPress={onManual}
      />
      <View style={{ height: 10 }} />

      <Item
        title="Use a template"
        subtitle="Start from your saved or default templates."
        onPress={onTemplates}
      />
      <View style={{ height: 10 }} />

      <Item
        title="From a past day"
        subtitle="Copy a previous log and tweak the details."
        onPress={onPast}
      />
      <View style={{ height: 10 }} />

      {onImport ? (
        <Item
          title="Import from library"
          subtitle="(Future) Browse marketplace and facility plans."
          onPress={onImport}
        />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1, padding: 16, gap: 12 },
});
