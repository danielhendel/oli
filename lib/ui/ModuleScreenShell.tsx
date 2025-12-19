// lib/ui/ModuleScreenShell.tsx
import { ReactNode } from "react";
import { View, Text, StyleSheet } from "react-native";

export type ModuleScreenShellProps = {
  title: string;
  subtitle?: string;
  children?: ReactNode;
};

export function ModuleScreenShell({ title, subtitle, children }: ModuleScreenShellProps) {
  return (
    <View style={styles.page}>
      <View style={styles.header}>
        <Text style={styles.title}>{title}</Text>
        {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
      </View>

      <View style={styles.content}>
        {children ?? (
          <View style={styles.empty}>
            <Text style={styles.emptyTitle}>Coming soon</Text>
            <Text style={styles.emptyBody}>
              This module is wired into the Command Center, but the experience will land in Sprint 6+.
            </Text>
          </View>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, padding: 16, gap: 16 },
  header: { gap: 6 },
  title: { fontSize: 26, fontWeight: "800" },
  subtitle: { fontSize: 15, opacity: 0.7 },

  content: { flex: 1 },
  empty: {
    flex: 1,
    borderRadius: 16,
    padding: 16,
    justifyContent: "center",
    backgroundColor: "#F2F2F7",
  },
  emptyTitle: { fontSize: 18, fontWeight: "800" },
  emptyBody: { marginTop: 8, fontSize: 14, opacity: 0.75, lineHeight: 20 },
});
