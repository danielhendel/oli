// app/(app)/(tabs)/timeline/index.tsx
import { FlatList, View, Text, StyleSheet, Pressable, Modal, TextInput } from "react-native";
import { useRouter } from "expo-router";
import { ScreenContainer, EmptyState } from "@/lib/ui/ScreenStates";
import { FailClosed } from "@/lib/ui/FailClosed";
import { OfflineBanner } from "@/lib/ui/OfflineBanner";
import { TruthIndicator } from "@/lib/ui/TruthIndicators";
import { PageTitleRow } from "@/lib/ui/PageTitleRow";
import { SettingsGearButton } from "@/lib/ui/SettingsGearButton";
import { useTimeline } from "@/lib/data/useTimeline";
import { useMemo, useState, useCallback } from "react";
import {
  getRangeForViewMode,
  shiftAnchor,
  type TimelineViewMode,
} from "@/lib/time/timelineRange";

const VIEW_MODES: { id: TimelineViewMode; label: string }[] = [
  { id: "day", label: "7d" },
  { id: "week", label: "14d" },
  { id: "month", label: "30d" },
];

const YYYY_MM_DD = /^\d{4}-\d{2}-\d{2}$/;

export default function TimelineIndexScreen() {
  const router = useRouter();
  const today = useMemo(() => new Date().toISOString().slice(0, 10), []);
  const [anchorDay, setAnchorDay] = useState(today);
  const [viewMode, setViewMode] = useState<TimelineViewMode>("week");
  const [jumpModalVisible, setJumpModalVisible] = useState(false);
  const [jumpInput, setJumpInput] = useState("");

  const range = useMemo(
    () => getRangeForViewMode(anchorDay, viewMode),
    [anchorDay, viewMode],
  );

  const timeline = useTimeline(range, { enabled: true });

  const outcome = useMemo(
    () =>
      timeline.status === "partial"
        ? { status: "partial" as const }
        : timeline.status === "error"
          ? {
              status: "error" as const,
              error: timeline.error,
              requestId: timeline.requestId,
              reason: timeline.reason,
            }
          : { status: "ready" as const, data: timeline.data },
    [timeline],
  );

  const fromCache = timeline.status === "ready" && timeline.fromCache === true;

  const goPrev = useCallback(() => {
    const delta = viewMode === "day" ? 7 : viewMode === "week" ? 14 : 30;
    setAnchorDay((d) => shiftAnchor(d, -delta));
  }, [viewMode]);

  const goNext = useCallback(() => {
    const delta = viewMode === "day" ? 7 : viewMode === "week" ? 14 : 30;
    setAnchorDay((d) => shiftAnchor(d, delta));
  }, [viewMode]);

  const handleJumpSubmit = useCallback(() => {
    const v = jumpInput.trim();
    if (YYYY_MM_DD.test(v) && !Number.isNaN(Date.parse(v + "T12:00:00.000Z"))) {
      setAnchorDay(v);
      setJumpModalVisible(false);
      setJumpInput("");
    }
  }, [jumpInput]);

  return (
    <ScreenContainer>
      <View style={styles.main}>
        <View style={styles.header}>
          <PageTitleRow
            title="Timeline"
            subtitle="Day list with presence and light counts"
            rightSlot={<SettingsGearButton />}
          />
        </View>
        <FailClosed
          outcome={outcome}
          onRetry={() => timeline.refetch()}
          secondaryAction={{
            label: "Open Settings",
            onPress: () => router.push("/(app)/settings"),
          }}
          loadingMessage="Loading timeline…"
        >
          {(data) => {
            const days = data.days;
            return (
              <>
                <OfflineBanner isOffline={fromCache} />
                <View style={styles.scroll}>
                  <View style={styles.navRow}>
                  <View style={styles.viewModeRow}>
                    {VIEW_MODES.map((m) => (
                      <Pressable
                        key={m.id}
                        style={[
                          styles.viewModeBtn,
                          viewMode === m.id && styles.viewModeBtnActive,
                        ]}
                        onPress={() => setViewMode(m.id)}
                      >
                        <Text
                          style={[
                            styles.viewModeBtnText,
                            viewMode === m.id && styles.viewModeBtnTextActive,
                          ]}
                        >
                          {m.label}
                        </Text>
                      </Pressable>
                    ))}
                  </View>
                  <View style={styles.navButtons}>
                    <Pressable style={styles.navBtn} onPress={goPrev}>
                      <Text style={styles.navBtnText}>‹</Text>
                    </Pressable>
                    <Pressable style={styles.navBtn} onPress={goNext}>
                      <Text style={styles.navBtnText}>›</Text>
                    </Pressable>
                    <Pressable
                      style={styles.jumpBtn}
                      onPress={() => setJumpModalVisible(true)}
                    >
                      <Text style={styles.jumpBtnText}>Jump</Text>
                    </Pressable>
                  </View>
                </View>

              {days.length === 0 ? (
                <EmptyState
                  title="No days"
                  description="No timeline data for this range."
                  explanation="Try a different date range or use Jump to go to another date."
                />
              ) : (
                <FlatList
                  data={days}
                  keyExtractor={(d) => d.day}
                  renderItem={({ item: d }) => (
                    <Pressable
                      style={styles.row}
                      onPress={() =>
                        router.push({
                          pathname: "/(app)/(tabs)/timeline/[day]",
                          params: { day: d.day },
                        })
                      }
                      accessibilityLabel={`Day ${d.day}, ${d.canonicalCount} events`}
                    >
                      <Text style={styles.rowDay}>{d.day}</Text>
                      <View style={styles.badges}>
                        <Text style={styles.badge}>
                          {d.canonicalCount} events
                        </Text>
                        {d.hasIncompleteEvents && (
                          <TruthIndicator
                            type="incomplete"
                            label={`${d.incompleteCount ?? 0} incomplete`}
                          />
                        )}
                        {d.dayCompletenessState && (
                          <Text style={styles.badge}>{d.dayCompletenessState}</Text>
                        )}
                        {d.uncertaintyStateRollup?.hasUncertain && (
                          <TruthIndicator type="uncertain" />
                        )}
                        {d.hasDailyFacts && (
                          <Text style={styles.badge}>facts</Text>
                        )}
                        {d.hasInsights && (
                          <Text style={styles.badge}>insights</Text>
                        )}
                        {d.hasIntelligenceContext && (
                          <Text style={styles.badge}>context</Text>
                        )}
                        {d.hasDerivedLedger && (
                          <Text style={styles.badge}>ledger</Text>
                        )}
                        {d.missingReasons && d.missingReasons.length > 0 && (
                          <Text style={styles.badgeMissing}>
                            {d.missingReasons.join(", ")}
                          </Text>
                        )}
                      </View>
                    </Pressable>
                  )}
                  ItemSeparatorComponent={() => <View style={styles.listGap} />}
                  ListFooterComponent={<View style={styles.listFooter} />}
                  initialNumToRender={14}
                  maxToRenderPerBatch={10}
                  windowSize={5}
                  removeClippedSubviews={true}
                  scrollEventThrottle={16}
                />
              )}

              <Modal
                visible={jumpModalVisible}
                transparent
                animationType="fade"
                onRequestClose={() => setJumpModalVisible(false)}
              >
                <Pressable
                  style={styles.modalOverlay}
                  onPress={() => setJumpModalVisible(false)}
                >
                  <Pressable
                    style={styles.modalContent}
                    onPress={(e) => e.stopPropagation()}
                  >
                    <Text style={styles.modalTitle}>Jump to date</Text>
                    <TextInput
                      style={styles.jumpInput}
                      placeholder="YYYY-MM-DD"
                      value={jumpInput}
                      onChangeText={setJumpInput}
                      autoCapitalize="none"
                      autoCorrect={false}
                    />
                    <View style={styles.modalButtons}>
                      <Pressable
                        style={styles.modalBtn}
                        onPress={() => setJumpModalVisible(false)}
                      >
                        <Text style={styles.modalBtnText}>Cancel</Text>
                      </Pressable>
                      <Pressable
                        style={[styles.modalBtn, styles.modalBtnPrimary]}
                        onPress={handleJumpSubmit}
                      >
                        <Text style={styles.modalBtnTextPrimary}>Go</Text>
                      </Pressable>
                    </View>
                </Pressable>
              </Pressable>
            </Modal>
                </View>
              </>
            );
          }}
        </FailClosed>
      </View>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  main: { flex: 1 },
  header: { paddingHorizontal: 16, paddingTop: 16, paddingBottom: 8 },
  scroll: { flex: 1, padding: 16, paddingBottom: 40 },
  listHeader: { height: 16 },
  listFooter: { height: 40 },
  listGap: { height: 6 },
  navRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 16,
    marginBottom: 8,
  },
  viewModeRow: { flexDirection: "row", gap: 4 },
  viewModeBtn: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 8,
    backgroundColor: "#F2F2F7",
  },
  viewModeBtnActive: { backgroundColor: "#1C1C1E" },
  viewModeBtnText: { fontSize: 14, fontWeight: "600", color: "#8E8E93" },
  viewModeBtnTextActive: { color: "#FFFFFF" },
  navButtons: { flexDirection: "row", gap: 8, alignItems: "center" },
  navBtn: {
    width: 36,
    height: 36,
    borderRadius: 8,
    backgroundColor: "#F2F2F7",
    justifyContent: "center",
    alignItems: "center",
  },
  navBtnText: { fontSize: 20, fontWeight: "700", color: "#1C1C1E" },
  jumpBtn: {
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 8,
    backgroundColor: "#F2F2F7",
  },
  jumpBtnText: { fontSize: 14, fontWeight: "600", color: "#007AFF" },
  list: {
    marginTop: 16,
    gap: 6,
  },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 16,
    backgroundColor: "#F2F2F7",
    borderRadius: 12,
  },
  rowDay: { fontSize: 17, fontWeight: "600", color: "#1C1C1E" },
  badges: { flexDirection: "row", gap: 8, flexWrap: "wrap" },
  badge: { fontSize: 12, color: "#8E8E93", fontWeight: "600" },
  badgeIncomplete: { fontSize: 12, color: "#8B6914", fontWeight: "600" },
  badgeUncertain: { fontSize: 12, color: "#6B4E99", fontWeight: "600" },
  badgeMissing: { fontSize: 11, color: "#8E8E93", fontStyle: "italic", maxWidth: 120 },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.4)",
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
  },
  modalContent: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 24,
    width: "100%",
    maxWidth: 320,
  },
  modalTitle: { fontSize: 17, fontWeight: "700", color: "#1C1C1E", marginBottom: 12 },
  jumpInput: {
    borderWidth: 1,
    borderColor: "#C7C7CC",
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    marginBottom: 20,
  },
  modalButtons: { flexDirection: "row", gap: 12, justifyContent: "flex-end" },
  modalBtn: {
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 8,
    backgroundColor: "#F2F2F7",
  },
  modalBtnPrimary: { backgroundColor: "#007AFF" },
  modalBtnText: { fontSize: 15, fontWeight: "600", color: "#1C1C1E" },
  modalBtnTextPrimary: { fontSize: 15, fontWeight: "600", color: "#FFFFFF" },
});
