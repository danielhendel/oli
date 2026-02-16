// components/forms/FormRow.tsx
import React from "react";
import { View, StyleSheet } from "react-native";
import { Text } from "../../lib/ui/Text";

type Props = {
  label: string;
  children: React.ReactNode;
  helpText?: string;
};

export default function FormRow({ label, children, helpText }: Props) {
  return (
    <View style={styles.wrap} accessible accessibilityLabel={label}>
      <Text weight="medium">{label}</Text>
      <View style={{ height: 6 }} />
      {children}
      {helpText ? (
        <>
          <View style={{ height: 6 }} />
          <Text size="sm" tone="muted">{helpText}</Text>
        </>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { marginBottom: 14 },
});
