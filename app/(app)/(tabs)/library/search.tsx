// app/(app)/(tabs)/library/search.tsx
// Phase 2 — Library search & filters (keyword, time range, uncertainty, provenance)
// Sprint 3 — Unresolved items lens (passive filter: incomplete/uncertain)

import { ScrollView, View, Text, StyleSheet, Pressable, TextInput, Modal } from "react-native";
import { useLocalSearchParams } from "expo-router";
import { ScreenContainer, LoadingState, ErrorState, EmptyState } from "@/lib/ui/ScreenStates";
import { useRawEvents } from "@/lib/data/useRawEvents";
import { useMemo, useState, useCallback, useEffect } from "react";
import { useAuth } from "@/lib/auth/AuthProvider";
import { ingestRawEventAuthed } from "@/lib/api/ingest";
import type { RawEventListItem } from "@oli/contracts";

const PROVENANCE_OPTIONS = ["manual", "device", "upload", "backfill", "correction"] as const;
const UNCERTAINTY_OPTIONS = ["complete", "incomplete", "uncertain"] as const;

function formatIsoToShort(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" });
}

export default function LibrarySearchScreen() {
  const params = useLocalSearchParams<{
    unresolvedLens?: string;
    uncertaintyFilter?: string;
    provenanceFilter?: string;
    kindsFilter?: string;
  }>();
  const [keyword, setKeyword] = useState("");
  const [start, setStart] = useState("");
  const [end, setEnd] = useState("");
  const [provenanceFilter, setProvenanceFilter] = useState<string[]>([]);
  const [uncertaintyFilter, setUncertaintyFilter] = useState<string[]>([]);
  const [unresolvedLens, setUnresolvedLens] = useState(false);
  const [kindsFilter, setKindsFilter] = useState<string[]>([]);

  // Sprint 4 — Apply quick lens params from navigation. Phase 3A: kindsFilter for Withings.
  useEffect(() => {
    if (params.unresolvedLens === "1") setUnresolvedLens(true);
    if (params.uncertaintyFilter === "uncertain") setUncertaintyFilter(["uncertain"]);
    if (params.provenanceFilter === "correction") setProvenanceFilter(["correction"]);
    if (params.kindsFilter) setKindsFilter(params.kindsFilter.split(",").map((k) => k.trim()).filter(Boolean));
  }, [params.unresolvedLens, params.uncertaintyFilter, params.provenanceFilter, params.kindsFilter]);
  const [resolveModalOpen, setResolveModalOpen] = useState(false);
  const [resolveTarget, setResolveTarget] = useState<RawEventListItem | null>(null);
  const [resolveNote, setResolveNote] = useState("");
  const [resolveSubmitting, setResolveSubmitting] = useState(false);
  const { getIdToken } = useAuth();

  const range = useMemo(() => {
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - 90);
    return {
      start: start || startDate.toISOString().slice(0, 10),
      end: end || endDate.toISOString().slice(0, 10),
    };
  }, [start, end]);

  const effectiveUncertainty = useMemo(() => {
    if (unresolvedLens) return ["incomplete", "uncertain"];
    return uncertaintyFilter;
  }, [unresolvedLens, uncertaintyFilter]);

  const rawEvents = useRawEvents(
    {
      start: range.start,
      end: range.end,
      ...(keyword.trim() ? { q: keyword.trim() } : {}),
      ...(provenanceFilter.length > 0 ? { provenance: provenanceFilter } : {}),
      ...(effectiveUncertainty.length > 0 ? { uncertaintyState: effectiveUncertainty } : {}),
      ...(kindsFilter.length > 0 ? { kinds: kindsFilter } : {}),
      limit: 50,
    },
    { enabled: true },
  );

  const openResolve = useCallback((ev: RawEventListItem) => {
    if (ev.kind !== "incomplete") return;
    setResolveTarget(ev);
    setResolveNote("");
    setResolveModalOpen(true);
  }, []);

  const submitResolve = useCallback(async () => {
    if (!resolveTarget || !resolveNote.trim()) return;
    setResolveSubmitting(true);
    const token = await getIdToken(false);
    if (!token) {
      setResolveSubmitting(false);
      return;
    }
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
    const result = await ingestRawEventAuthed(
      {
        provider: "manual",
        kind: "incomplete",
        observedAt: resolveTarget.observedAt,
        timeZone: tz,
        payload: { note: resolveNote.trim().slice(0, 256) },
        provenance: "correction",
        correctionOfRawEventId: resolveTarget.id,
      },
      token,
      { idempotencyKey: `correction_${resolveTarget.id}_note_${Date.now()}` },
    );
    setResolveSubmitting(false);
    if (result.ok) {
      setResolveModalOpen(false);
      setResolveTarget(null);
      rawEvents.refetch();
    }
  }, [resolveTarget, resolveNote, getIdToken, rawEvents]);

  const toggleProvenance = (p: string) => {
    setProvenanceFilter((prev) =>
      prev.includes(p) ? prev.filter((x) => x !== p) : [...prev, p],
    );
  };

  const toggleUncertainty = (u: string) => {
    setUncertaintyFilter((prev) =>
      prev.includes(u) ? prev.filter((x) => x !== u) : [...prev, u],
    );
  };

  if (rawEvents.status === "partial") {
    return (
      <ScreenContainer>
        <LoadingState message="Loading search…" />
      </ScreenContainer>
    );
  }

  if (rawEvents.status === "error") {
    return (
      <ScreenContainer>
        <ErrorState
          message={rawEvents.error}
          requestId={rawEvents.requestId}
          onRetry={() => rawEvents.refetch()}
        />
      </ScreenContainer>
    );
  }

  const items = rawEvents.data.items;

  return (
    <ScreenContainer>
      <ScrollView contentContainerStyle={styles.scroll}>
        <Text style={styles.title}>Search</Text>
        <Text style={styles.subtitle}>
          Keyword, time range, uncertainty, provenance
        </Text>

        <TextInput
          style={styles.input}
          placeholder="Keyword (id or note)"
          value={keyword}
          onChangeText={setKeyword}
        />
        <View style={styles.dateRow}>
          <TextInput
            style={[styles.input, styles.dateInput]}
            placeholder="Start YYYY-MM-DD"
            value={start}
            onChangeText={setStart}
          />
          <TextInput
            style={[styles.input, styles.dateInput]}
            placeholder="End YYYY-MM-DD"
            value={end}
            onChangeText={setEnd}
          />
        </View>

        <Pressable
          style={[styles.unresolvedLens, unresolvedLens && styles.unresolvedLensActive]}
          onPress={() => setUnresolvedLens(!unresolvedLens)}
        >
          <Text
            style={[
              styles.unresolvedLensText,
              unresolvedLens && styles.unresolvedLensTextActive,
            ]}
          >
            Unresolved items (incomplete / uncertain)
          </Text>
        </Pressable>

        <Text style={styles.filterLabel}>Provenance</Text>
        <View style={styles.chipRow}>
          {PROVENANCE_OPTIONS.map((p) => (
            <Pressable
              key={p}
              style={[
                styles.chip,
                provenanceFilter.includes(p) && styles.chipActive,
              ]}
              onPress={() => toggleProvenance(p)}
            >
              <Text
                style={[
                  styles.chipText,
                  provenanceFilter.includes(p) && styles.chipTextActive,
                ]}
              >
                {p}
              </Text>
            </Pressable>
          ))}
        </View>

        <Text style={styles.filterLabel}>Uncertainty</Text>
        <View style={styles.chipRow}>
          {UNCERTAINTY_OPTIONS.map((u) => (
            <Pressable
              key={u}
              style={[
                styles.chip,
                uncertaintyFilter.includes(u) && styles.chipActive,
              ]}
              onPress={() => toggleUncertainty(u)}
            >
              <Text
                style={[
                  styles.chipText,
                  uncertaintyFilter.includes(u) && styles.chipTextActive,
                ]}
              >
                {u}
              </Text>
            </Pressable>
          ))}
        </View>

        <Text style={styles.resultsLabel}>
          {items.length} result{items.length !== 1 ? "s" : ""}
        </Text>

        {items.length === 0 ? (
          <EmptyState
            title="No matches"
            description="Try adjusting filters or keyword."
          />
        ) : (
          <View style={styles.list}>
            {items.map((ev) => (
              <Pressable
                key={ev.id}
                style={styles.row}
                onPress={() => ev.kind === "incomplete" && openResolve(ev)}
              >
                <Text style={styles.rowKind}>{ev.kind}</Text>
                <Text style={styles.rowTime}>
                  {formatIsoToShort(ev.observedAt)}
                </Text>
                {(ev.sourceId && ev.sourceId !== "manual") && (
                  <Text style={styles.rowMeta}>Source: {ev.sourceId}</Text>
                )}
                {ev.provenance && (
                  <Text style={styles.rowMeta}>{ev.provenance}</Text>
                )}
                {ev.correctionOfRawEventId && (
                  <Text style={styles.rowCorrection}>
                    corrects {ev.correctionOfRawEventId}
                  </Text>
                )}
                {ev.kind === "incomplete" && (
                  <Text style={styles.resolveHint}>Resolve</Text>
                )}
              </Pressable>
            ))}
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
                placeholder="Note (what happened)"
                value={resolveNote}
                onChangeText={setResolveNote}
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
                  disabled={resolveSubmitting || !resolveNote.trim()}
                >
                  <Text style={styles.modalBtnTextPrimary}>
                    {resolveSubmitting ? "…" : "Add note"}
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
  input: {
    marginTop: 12,
    borderWidth: 1,
    borderColor: "#C7C7CC",
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
  },
  dateRow: { flexDirection: "row", gap: 8, marginTop: 12 },
  dateInput: { flex: 1 },
  filterLabel: { fontSize: 13, fontWeight: "600", color: "#8E8E93", marginTop: 20, marginBottom: 8 },
  chipRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  chip: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 8,
    backgroundColor: "#F2F2F7",
  },
  chipActive: { backgroundColor: "#1C1C1E" },
  chipText: { fontSize: 13, fontWeight: "600", color: "#8E8E93" },
  chipTextActive: { color: "#FFFFFF" },
  resultsLabel: { fontSize: 15, fontWeight: "600", color: "#1C1C1E", marginTop: 24, marginBottom: 12 },
  list: { gap: 8 },
  row: {
    padding: 14,
    backgroundColor: "#F2F2F7",
    borderRadius: 12,
  },
  rowKind: { fontSize: 15, fontWeight: "600", color: "#1C1C1E" },
  rowTime: { fontSize: 14, color: "#8E8E93", marginTop: 4 },
  rowMeta: { fontSize: 12, color: "#8E8E93", marginTop: 2 },
  rowCorrection: { fontSize: 12, color: "#6B4E99", marginTop: 2 },
  resolveHint: { fontSize: 12, color: "#007AFF", fontWeight: "600", marginTop: 4 },
  unresolvedLens: {
    marginTop: 16,
    padding: 12,
    backgroundColor: "#F2F2F7",
    borderRadius: 12,
  },
  unresolvedLensActive: { backgroundColor: "#FFF8E6" },
  unresolvedLensText: { fontSize: 15, fontWeight: "600", color: "#8E8E93" },
  unresolvedLensTextActive: { fontSize: 15, fontWeight: "600", color: "#8B6914" },
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
