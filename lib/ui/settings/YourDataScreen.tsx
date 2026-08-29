/**
 * Your Data — user-facing inventory of what Oli knows (Phase 3B).
 * Data-status UI only — no health classification vocabulary, no raw values, no collection names.
 */

import React from "react";
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from "react-native";
import { useRouter } from "expo-router";

import type { InventorySectionRow, InventoryStatusChip } from "@/lib/data/user-data/buildUserDataInventoryViewModel";
import type { UserDataInventoryLoadState } from "@/lib/data/user-data/useUserDataInventory";
import type { UserDataInventoryViewModel } from "@/lib/data/user-data/buildUserDataInventoryViewModel";
import type { UserDataExportHookResult } from "@/lib/data/user-data/export/useUserDataExport";
import { ModuleScreenShell } from "@/lib/ui/ModuleScreenShell";
import { UserDataExportSection } from "@/lib/ui/settings/UserDataExportSection";
import {
  UI_BORDER_SUBTLE,
  UI_PANEL_SURFACE,
  UI_TEXT_PRIMARY,
  UI_TEXT_SECONDARY,
  UI_TEXT_TERTIARY_LABEL,
} from "@/lib/ui/theme/uiTokens";

export type YourDataScreenProps = {
  state: UserDataInventoryLoadState;
  inventory: UserDataInventoryViewModel | null;
  error: string | null;
  onRefresh: () => void;
  exportHook: UserDataExportHookResult;
};

function StatusChip({ chip }: { chip: InventoryStatusChip }) {
  const tone =
    chip === "Needs attention" || chip === "Connection unavailable" || chip === "Needs reconnection"
      ? "attention"
      : chip === "Coming soon" || chip === "Not set up" || chip === "Stored, not structured"
        ? "muted"
        : chip === "Connected" || chip === "Available"
          ? "ok"
          : "neutral";

  return (
    <View
      style={[
        styles.chip,
        tone === "attention" && styles.chipAttention,
        tone === "muted" && styles.chipMuted,
        tone === "ok" && styles.chipOk,
      ]}
      accessibilityLabel={`Status ${chip}`}
    >
      <Text style={styles.chipText}>{chip}</Text>
    </View>
  );
}

function Section({
  title,
  rows,
  testID,
}: {
  title: string;
  rows: readonly InventorySectionRow[];
  testID: string;
}) {
  return (
    <View style={styles.section} testID={testID} accessibilityRole="summary">
      <Text style={styles.sectionTitle}>{title}</Text>
      {rows.map((row) => (
        <View key={row.id} style={styles.row} accessible accessibilityLabel={`${row.title}, ${row.statusChip}`}>
          <View style={styles.rowHeader}>
            <Text style={styles.rowTitle}>{row.title}</Text>
            <StatusChip chip={row.statusChip} />
          </View>
          <Text style={styles.rowSummary}>{row.summary}</Text>
        </View>
      ))}
    </View>
  );
}

export function YourDataScreen({ state, inventory, error, onRefresh, exportHook }: YourDataScreenProps) {
  const router = useRouter();

  return (
    <ModuleScreenShell title="Your Data" hideTitleChrome>
      <View style={styles.root} testID="your-data-screen">
        {state === "loading" && !inventory ? (
          <View style={styles.loading} testID="your-data-loading" accessibilityLabel="Loading your data">
            <ActivityIndicator color={UI_TEXT_PRIMARY} />
            <Text style={styles.loadingText}>Loading inventory…</Text>
          </View>
        ) : null}

        {error ? (
          <Text style={styles.error} testID="your-data-error" accessibilityRole="alert">
            {error}
          </Text>
        ) : null}

        {inventory ? (
          <>
            <Text style={styles.intro} testID="your-data-intro">
              This is a data inventory — status of sources and records, not health scores.
            </Text>

            <Section title="Profile" rows={inventory.profileRows} testID="your-data-profile" />
            <Section title="Connected sources" rows={inventory.sourceRows} testID="your-data-sources" />
            <Section title="Health records" rows={inventory.recordRows} testID="your-data-records" />
            <Section title="Controls" rows={inventory.controlRows} testID="your-data-controls" />

            <UserDataExportSection {...exportHook} />

            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Open privacy"
              testID="your-data-open-privacy"
              onPress={() => router.push("/(app)/settings/privacy")}
              style={({ pressed }) => [styles.linkRow, pressed && styles.linkPressed]}
            >
              <Text style={styles.linkText}>Privacy & export details</Text>
            </Pressable>

            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Refresh inventory"
              testID="your-data-refresh"
              onPress={onRefresh}
              style={({ pressed }) => [styles.linkRow, pressed && styles.linkPressed]}
            >
              <Text style={styles.linkText}>Refresh inventory</Text>
            </Pressable>
          </>
        ) : null}

        {state === "error" && !inventory ? (
          <Text style={styles.error} testID="your-data-fatal-error">
            Inventory could not be loaded.
          </Text>
        ) : null}
      </View>
    </ModuleScreenShell>
  );
}

const styles = StyleSheet.create({
  root: { gap: 18 },
  intro: {
    fontSize: 14,
    lineHeight: 20,
    color: UI_TEXT_SECONDARY,
  },
  loading: {
    alignItems: "center",
    gap: 10,
    paddingVertical: 24,
  },
  loadingText: {
    fontSize: 14,
    color: UI_TEXT_TERTIARY_LABEL,
  },
  error: {
    fontSize: 14,
    lineHeight: 20,
    color: "#FF9F0A",
  },
  section: { gap: 10 },
  sectionTitle: {
    fontSize: 13,
    fontWeight: "600",
    color: UI_TEXT_TERTIARY_LABEL,
    textTransform: "uppercase",
    letterSpacing: 0.4,
  },
  row: {
    paddingVertical: 14,
    paddingHorizontal: 14,
    borderRadius: 14,
    backgroundColor: UI_PANEL_SURFACE,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: UI_BORDER_SUBTLE,
    gap: 6,
  },
  rowHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
  },
  rowTitle: {
    flex: 1,
    fontSize: 16,
    fontWeight: "600",
    color: UI_TEXT_PRIMARY,
  },
  rowSummary: {
    fontSize: 14,
    lineHeight: 20,
    color: UI_TEXT_SECONDARY,
  },
  chip: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    backgroundColor: "rgba(255,255,255,0.08)",
  },
  chipAttention: {
    backgroundColor: "rgba(255,159,10,0.18)",
  },
  chipMuted: {
    backgroundColor: "rgba(255,255,255,0.06)",
  },
  chipOk: {
    backgroundColor: "rgba(52,199,89,0.16)",
  },
  chipText: {
    fontSize: 12,
    fontWeight: "600",
    color: UI_TEXT_PRIMARY,
  },
  linkRow: {
    minHeight: 44,
    justifyContent: "center",
  },
  linkPressed: { opacity: 0.85 },
  linkText: {
    fontSize: 15,
    fontWeight: "600",
    color: UI_TEXT_PRIMARY,
  },
});
