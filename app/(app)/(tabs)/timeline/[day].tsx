// app/(app)/(tabs)/timeline/[day].tsx
import { ScrollView, View, Text, StyleSheet, Pressable, Modal, TextInput } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { ScreenContainer } from "@/lib/ui/ScreenStates";
import { LoadingState, ErrorState, EmptyState } from "@/lib/ui/ScreenStates";
import { useEvents } from "@/lib/data/useEvents";
import { useRawEvents } from "@/lib/data/useRawEvents";
import { useFailures } from "@/lib/data/useFailures";
import { useAuth } from "@/lib/auth/AuthProvider";
import { ingestRawEventAuthed } from "@/lib/api/ingest";
import { useMemo, useState, useCallback } from "react";
import type { CanonicalEventListItem } from "@oli/contracts";

const YYYY_MM_DD = /^\d{4}-\d{2}-\d{2}$/;

function formatIsoToShort(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleTimeString(undefined, {
    hour: "2-digit",
    minute: "2-digit",
  });
}

function groupByKind(items: CanonicalEventListItem[]): Map<string, CanonicalEventListItem[]> {
  const map = new Map<string, CanonicalEventListItem[]>();
  for (const item of items) {
    const list = map.get(item.kind) ?? [];
    list.push(item);
    map.set(item.kind, list);
  }
  for (const list of map.values()) {
    list.sort((a, b) => Date.parse(b.start) - Date.parse(a.start));
  }
  return map;
}

export default function TimelineDayScreen() {
  const params = useLocalSearchParams<{ day: string }>();
  const router = useRouter();
  const dayParam = params.day ?? "";
  const day = YYYY_MM_DD.test(dayParam) ? dayParam : "";

  const [provenanceExpanded, setProvenanceExpanded] = useState(false);
  const [resolveModalOpen, setResolveModalOpen] = useState(false);
  const [resolveTarget, setResolveTarget] = useState<{ id: string; observedAt: string } | null>(null);
  const [resolveWeight, setResolveWeight] = useState("");
  const [resolveSubmitting, setResolveSubmitting] = useState(false);
  const { getIdToken } = useAuth();

  const startIso = `${day}T00:00:00.000Z`;
  const endIso = `${day}T23:59:59.999Z`;

  const events = useEvents(
    { start: startIso, end: endIso, limit: 100 },
    { enabled: !!day },
  );

  const rawIncomplete = useRawEvents(
    { start: startIso, end: endIso, kinds: ["incomplete"], limit: 50 },
    { enabled: !!day },
  );

  const failures = useFailures({ day }, { enabled: !!day });

  const hasFailures =
    failures.status === "ready" && failures.data.items.length > 0;

  const autoExpandProvenance = useMemo(
    () => hasFailures || provenanceExpanded,
    [hasFailures, provenanceExpanded],
  );

  const isContractError =
    events.status === "error" && events.reason === "contract";

  if (!day) {
    return (
      <ScreenContainer>
        <ErrorState message="Invalid day parameter" />
      </ScreenContainer>
    );
  }

  if (events.status === "partial") {
    return (
      <ScreenContainer>
        <LoadingState message="Loading day…" />
      </ScreenContainer>
    );
  }

  if (events.status === "error") {
    return (
      <ScreenContainer>
        <ErrorState
          message={events.error}
          requestId={events.requestId}
          onRetry={() => events.refetch()}
          isContractError={isContractError}
        />
      </ScreenContainer>
    );
  }

  const items = events.data.items;
  const grouped = groupByKind(items);

  const incompleteItems =
    rawIncomplete.status === "ready" ? rawIncomplete.data.items : [];
  const hasIncomplete = incompleteItems.length > 0;

  const openResolve = useCallback((r: { id: string; observedAt: string }) => {
    setResolveTarget(r);
    setResolveWeight("");
    setResolveModalOpen(true);
  }, []);

  const submitResolve = useCallback(async () => {
    if (!resolveTarget || !resolveWeight.trim()) return;
    const w = parseFloat(resolveWeight.trim());
    if (Number.isNaN(w) || w <= 0) return;

    setResolveSubmitting(true);
    const token = await getIdToken(false);
    if (!token) {
      setResolveSubmitting(false);
      return;
    }

    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
    const idempotencyKey = `correction_${resolveTarget.id}_weight_${Date.now()}`;

    const result = await ingestRawEventAuthed(
      {
        provider: "manual",
        kind: "weight",
        observedAt: resolveTarget.observedAt,
        timeZone: tz,
        payload: { time: resolveTarget.observedAt, timezone: tz, weightKg: w },
        provenance: "correction",
        correctionOfRawEventId: resolveTarget.id,
      },
      token,
      { idempotencyKey },
    );

    setResolveSubmitting(false);
    if (result.ok) {
      setResolveModalOpen(false);
      setResolveTarget(null);
      events.refetch();
      rawIncomplete.refetch();
    }
  }, [resolveTarget, resolveWeight, getIdToken, events, rawIncomplete]);

  return (
    <ScreenContainer>
      <ScrollView contentContainerStyle={styles.scroll}>
        <Text style={styles.title}>{day}</Text>
        <Text style={styles.subtitle}>
          Canonical events, derived presence, failures
        </Text>

        {hasFailures && (
          <View style={styles.failuresBanner}>
            <Text style={styles.failuresBannerText}>
              {failures.status === "ready"
                ? `${failures.data.items.length} failure(s) recorded`
                : "Failures present"}
            </Text>
          </View>
        )}

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Events</Text>
          {hasIncomplete && (
            <View style={styles.incompleteBanner}>
              <Text style={styles.incompleteBannerText}>
                {incompleteItems.length} incomplete (something happened)
              </Text>
            </View>
          )}
          {items.length === 0 && !hasIncomplete ? (
            <EmptyState title="No events" description="No events for this day." />
          ) : (
            <>
              {hasIncomplete && (
                <View style={styles.kindGroup}>
                  <Text style={styles.kindHeaderIncomplete}>incomplete</Text>
                  {incompleteItems.map((r) => (
                    <Pressable
                      key={r.id}
                      style={styles.eventRow}
                      onPress={() => openResolve({ id: r.id, observedAt: r.observedAt })}
                    >
                      <Text style={styles.eventTime}>
                        {formatIsoToShort(r.observedAt)} — something happened
                      </Text>
                      <Text style={styles.resolveHint}>Resolve</Text>
                    </Pressable>
                  ))}
                </View>
              )}
              {Array.from(grouped.entries()).map(([kind, evs]) => (
                <View key={kind} style={styles.kindGroup}>
                  <Text style={styles.kindHeader}>{kind}</Text>
                  {evs.map((ev) => (
                    <Pressable
                      key={ev.id}
                      style={styles.eventRow}
                      onPress={() =>
                        router.push({
                          pathname: "/(app)/event/[id]",
                          params: { id: ev.id },
                        })
                      }
                    >
                      <Text style={styles.eventTime}>
                        {formatIsoToShort(ev.start)}
                      </Text>
                    </Pressable>
                  ))}
                </View>
              ))}
            </>
          )}
        </View>

        <Pressable
          style={styles.replayRow}
          onPress={() =>
            router.push({
              pathname: "/(app)/(tabs)/library/replay/day/[dayKey]",
              params: { dayKey: day },
            })
          }
        >
          <Text style={styles.replayRowText}>Replay this day</Text>
        </Pressable>

        <Pressable
          style={styles.provenanceToggle}
          onPress={() => setProvenanceExpanded(!provenanceExpanded)}
        >
          <Text style={styles.provenanceToggleText}>
            {autoExpandProvenance ? "▼" : "▶"} Provenance
          </Text>
        </Pressable>
        {autoExpandProvenance && (
          <View style={styles.provenanceContent}>
            <Text style={styles.provenanceText}>
              Day: {day}. Provenance collapsed by default, auto-expanded when
              failures exist.
            </Text>
          </View>
        )}

        <Modal
          visible={resolveModalOpen}
          transparent
          animationType="fade"
          onRequestClose={() => setResolveModalOpen(false)}
        >
          <Pressable
            style={styles.modalOverlay}
            onPress={() => setResolveModalOpen(false)}
          >
            <Pressable
              style={styles.modalContent}
              onPress={(e) => e.stopPropagation()}
            >
              <Text style={styles.modalTitle}>Resolve incomplete</Text>
              <Text style={styles.modalSubtitle}>
                Add missing details. Original record is preserved.
              </Text>
              <TextInput
                style={styles.resolveInput}
                placeholder="Weight (kg)"
                value={resolveWeight}
                onChangeText={setResolveWeight}
                keyboardType="decimal-pad"
              />
              <View style={styles.modalButtons}>
                <Pressable
                  style={styles.modalBtn}
                  onPress={() => setResolveModalOpen(false)}
                >
                  <Text style={styles.modalBtnText}>Cancel</Text>
                </Pressable>
                <Pressable
                  style={[styles.modalBtn, styles.modalBtnPrimary]}
                  onPress={submitResolve}
                  disabled={resolveSubmitting || !resolveWeight.trim()}
                >
                  <Text style={styles.modalBtnTextPrimary}>
                    {resolveSubmitting ? "…" : "Add as weight"}
                  </Text>
                </Pressable>
              </View>
            </Pressable>
          </Pressable>
        </Modal>
      </ScrollView>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  scroll: { padding: 16, paddingBottom: 40 },
  title: { fontSize: 28, fontWeight: "900", color: "#1C1C1E" },
  subtitle: { fontSize: 15, color: "#8E8E93", marginTop: 4 },
  failuresBanner: {
    marginTop: 16,
    padding: 12,
    backgroundColor: "#FFF5E6",
    borderRadius: 12,
  },
  failuresBannerText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#7A4E00",
  },
  section: { marginTop: 24 },
  sectionTitle: {
    fontSize: 17,
    fontWeight: "700",
    color: "#1C1C1E",
    marginBottom: 12,
  },
  incompleteBanner: {
    marginBottom: 12,
    padding: 10,
    backgroundColor: "#FFF8E6",
    borderRadius: 10,
  },
  incompleteBannerText: { fontSize: 14, fontWeight: "600", color: "#8B6914" },
  kindGroup: { marginBottom: 16 },
  kindHeader: {
    fontSize: 13,
    fontWeight: "700",
    color: "#8E8E93",
    marginBottom: 6,
  },
  kindHeaderIncomplete: {
    fontSize: 13,
    fontWeight: "700",
    color: "#8B6914",
    marginBottom: 6,
  },
  eventRow: {
    padding: 14,
    backgroundColor: "#F2F2F7",
    borderRadius: 12,
    marginBottom: 6,
  },
  eventTime: { fontSize: 15, color: "#1C1C1E" },
  replayRow: {
    marginTop: 24,
    padding: 14,
    backgroundColor: "#F2F2F7",
    borderRadius: 12,
  },
  replayRowText: {
    fontSize: 15,
    fontWeight: "600",
    color: "#007AFF",
  },
  provenanceToggle: {
    marginTop: 24,
    padding: 12,
    backgroundColor: "#F2F2F7",
    borderRadius: 12,
  },
  provenanceToggleText: { fontSize: 15, fontWeight: "600", color: "#1C1C1E" },
  provenanceContent: { marginTop: 8, padding: 12 },
  provenanceText: { fontSize: 14, color: "#8E8E93", lineHeight: 20 },
  resolveHint: { fontSize: 12, color: "#007AFF", fontWeight: "600", marginTop: 4 },
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
  modalTitle: { fontSize: 17, fontWeight: "700", color: "#1C1C1E", marginBottom: 4 },
  modalSubtitle: { fontSize: 14, color: "#8E8E93", marginBottom: 16 },
  resolveInput: {
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
