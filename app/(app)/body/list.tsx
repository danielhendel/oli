import React, { useCallback, useLayoutEffect, useMemo, useState } from "react";
import { Alert, FlatList, StyleSheet, Text, View } from "react-native";
import { useLocalSearchParams, useNavigation } from "expo-router";

import {
  BODY_HISTORY_METRIC_TITLES,
  parseBodyHistoryMetricParam,
} from "@/lib/data/body/bodyHistoryMetricFilter";
import {
  buildBodyCompositionLogRowVm,
  type BodyCompositionLogEntry,
} from "@/lib/data/body/bodyCompositionLogEntries";
import { useBodyCompositionLog } from "@/lib/data/body/useBodyCompositionLog";
import { useBodyWeightLogMutations } from "@/lib/hooks/useBodyWeightLogMutations";
import { usePreferences } from "@/lib/preferences/PreferencesProvider";
import { HeaderBackButton } from "@/lib/ui/HeaderBackButton";
import { MetricLogRow } from "@/lib/ui/logs/MetricLogRow";
import { MetricLogRowMenu, type MetricLogRowMenuAnchor } from "@/lib/ui/logs/MetricLogRowMenu";
import { EmptyState, ErrorState, LoadingState, ScreenContainer } from "@/lib/ui/ScreenStates";
import {
  WORKOUTS_SCREEN_CONTENT_BG,
  workoutsStackNavigationOptions,
} from "@/lib/ui/headers/workoutsStackHeader";
import { WeightLogModal, type WeightLogModalEditTarget } from "@/lib/ui/WeightLogModal";

export default function BodyCompositionLogScreen() {
  const navigation = useNavigation();
  const params = useLocalSearchParams<{ metric?: string }>();
  const historyMetric = parseBodyHistoryMetricParam(params.metric);
  const metricTitle = BODY_HISTORY_METRIC_TITLES[historyMetric];
  const log = useBodyCompositionLog(historyMetric);
  const mutations = useBodyWeightLogMutations();
  const { state: prefState } = usePreferences();
  const unit = prefState.preferences?.units?.mass ?? "lb";

  const [menuEntry, setMenuEntry] = useState<BodyCompositionLogEntry | null>(null);
  const [menuAnchor, setMenuAnchor] = useState<MetricLogRowMenuAnchor | null>(null);
  const [editTarget, setEditTarget] = useState<WeightLogModalEditTarget | null>(null);
  const [editVisible, setEditVisible] = useState(false);

  useLayoutEffect(() => {
    navigation.setOptions({
      ...workoutsStackNavigationOptions("detail"),
      headerStyle: { backgroundColor: WORKOUTS_SCREEN_CONTENT_BG },
      headerLeft: () => (
        <HeaderBackButton onPress={() => navigation.goBack()} accessibilityLabel="Go back" />
      ),
      title: `${metricTitle} History`,
    });
  }, [navigation, metricTitle]);

  const rows = useMemo(
    () => log.entries.map((entry) => buildBodyCompositionLogRowVm(entry, unit, historyMetric)),
    [log.entries, unit, historyMetric],
  );

  const closeMenu = useCallback(() => {
    setMenuEntry(null);
    setMenuAnchor(null);
  }, []);

  const refresh = useCallback(() => {
    log.refetch();
  }, [log]);

  const onDelete = useCallback(
    (entry: BodyCompositionLogEntry) => {
      const isImported = entry.isImported;
      const sourceLabel = entry.provider === "apple_health" ? "Apple Health" : "the original source";
      const message = isImported
        ? `This will hide this entry from Oli.\nThe original value remains in ${sourceLabel}.`
        : `Delete this ${metricTitle.toLowerCase()} entry?`;
      Alert.alert(isImported ? "Delete from Oli?" : "Delete entry?", message, [
        { text: "Cancel", style: "cancel" },
        {
          text: isImported ? "Delete from Oli" : "Delete",
          style: "destructive",
          onPress: () => {
            void (async () => {
              const res = await mutations.deleteEntry(entry.rawEventId);
              if (res.ok) refresh();
            })();
          },
        },
      ]);
    },
    [mutations, refresh, metricTitle],
  );

  const onEdit = useCallback((entry: BodyCompositionLogEntry) => {
    if (entry.weightKg == null) return;
    setEditTarget({
      rawEventId: entry.rawEventId,
      observedAtIso: entry.observedAt,
      weightKg: entry.weightKg,
      bodyFatPercent: entry.bodyFatPercent,
      isImported: entry.isImported,
      ...(entry.provider === "apple_health" ? { importedSourceLabel: "Apple Health" } : {}),
    });
    setEditVisible(true);
  }, []);

  const renderItem = useCallback(
    ({ item }: { item: ReturnType<typeof buildBodyCompositionLogRowVm> }) => (
      <MetricLogRow
        testID={`body-composition-log-row-${item.entry.rawEventId}`}
        dateLabel={item.dateLabel}
        primaryMetric={item.primaryMetric}
        secondaryMetric={item.secondaryMetric}
        accessibilityLabel={item.accessibilityLabel}
        onOpenMenu={(anchor) => {
          setMenuEntry(item.entry);
          setMenuAnchor(anchor);
        }}
      />
    ),
    [],
  );

  if (log.status === "partial") {
    return (
      <ScreenContainer backgroundColor={WORKOUTS_SCREEN_CONTENT_BG}>
        <LoadingState message={`Loading ${metricTitle} history…`} />
      </ScreenContainer>
    );
  }

  if (log.status === "error") {
    return (
      <ScreenContainer backgroundColor={WORKOUTS_SCREEN_CONTENT_BG}>
        <ErrorState message={log.error ?? "Could not load log"} requestId={log.requestId} onRetry={refresh} />
      </ScreenContainer>
    );
  }

  return (
    <ScreenContainer
      backgroundColor={WORKOUTS_SCREEN_CONTENT_BG}
      padded={false}
      edges={["left", "right", "bottom"]}
    >
      <View style={styles.body} testID={`body-composition-log-screen-${historyMetric}`}>
        {mutations.errorMessage ? (
          <Text style={styles.banner} accessibilityRole="alert" accessibilityLiveRegion="polite">
            {mutations.errorMessage}
          </Text>
        ) : null}
        <FlatList
          data={rows}
          keyExtractor={(item) => item.entry.rawEventId}
          renderItem={renderItem}
          contentContainerStyle={styles.listContent}
          ListEmptyComponent={
            <EmptyState
              title={`No ${metricTitle} entries yet`}
              description={`When you log or sync ${metricTitle}, entries will appear here. Other Body metrics are not shown as a fallback.`}
              testID="body-composition-log-empty"
            />
          }
        />
      </View>
      <MetricLogRowMenu
        visible={menuEntry != null}
        anchor={menuAnchor}
        onClose={closeMenu}
        onEdit={() => {
          if (menuEntry?.canEdit && menuEntry.weightKg != null) onEdit(menuEntry);
        }}
        onDelete={() => {
          if (menuEntry?.canDelete) onDelete(menuEntry);
        }}
        editDisabledReason={
          menuEntry?.canEdit && menuEntry.weightKg != null
            ? null
            : (menuEntry?.editDisabledReason ?? "Edit unavailable")
        }
        deleteDisabledReason={
          menuEntry?.canDelete ? null : (menuEntry?.deleteDisabledReason ?? "Delete unavailable")
        }
        deleteLabel={menuEntry?.deleteMenuLabel ?? "Delete"}
      />
      <WeightLogModal
        visible={editVisible}
        editTarget={editTarget}
        onClose={() => {
          setEditVisible(false);
          setEditTarget(null);
        }}
        onSaved={refresh}
      />
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  body: { flex: 1 },
  listContent: {
    paddingHorizontal: 24,
    paddingTop: 8,
    paddingBottom: 32,
    flexGrow: 1,
  },
  banner: {
    marginHorizontal: 24,
    marginTop: 8,
    marginBottom: 4,
    fontSize: 13,
    color: "#B00020",
  },
});
