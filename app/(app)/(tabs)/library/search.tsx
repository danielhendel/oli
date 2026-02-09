// app/(app)/(tabs)/library/search.tsx
// Phase 2 — Library search & filters (keyword, time range, uncertainty, provenance)

import { ScrollView, View, Text, StyleSheet, Pressable, TextInput } from "react-native";
import { ScreenContainer, LoadingState, ErrorState, EmptyState } from "@/lib/ui/ScreenStates";
import { useRawEvents } from "@/lib/data/useRawEvents";
import { useMemo, useState } from "react";

const PROVENANCE_OPTIONS = ["manual", "device", "upload", "backfill", "correction"] as const;
const UNCERTAINTY_OPTIONS = ["complete", "incomplete", "uncertain"] as const;

function formatIsoToShort(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" });
}

export default function LibrarySearchScreen() {
  const [keyword, setKeyword] = useState("");
  const [start, setStart] = useState("");
  const [end, setEnd] = useState("");
  const [provenanceFilter, setProvenanceFilter] = useState<string[]>([]);
  const [uncertaintyFilter, setUncertaintyFilter] = useState<string[]>([]);

  const range = useMemo(() => {
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - 90);
    return {
      start: start || startDate.toISOString().slice(0, 10),
      end: end || endDate.toISOString().slice(0, 10),
    };
  }, [start, end]);

  const rawEvents = useRawEvents(
    {
      start: range.start,
      end: range.end,
      ...(keyword.trim() ? { q: keyword.trim() } : {}),
      ...(provenanceFilter.length > 0 ? { provenance: provenanceFilter } : {}),
      ...(uncertaintyFilter.length > 0 ? { uncertaintyState: uncertaintyFilter } : {}),
      limit: 50,
    },
    { enabled: true },
  );

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
              <View key={ev.id} style={styles.row}>
                <Text style={styles.rowKind}>{ev.kind}</Text>
                <Text style={styles.rowTime}>
                  {formatIsoToShort(ev.observedAt)}
                </Text>
                {ev.provenance && (
                  <Text style={styles.rowMeta}>{ev.provenance}</Text>
                )}
                {ev.correctionOfRawEventId && (
                  <Text style={styles.rowCorrection}>
                    corrects {ev.correctionOfRawEventId}
                  </Text>
                )}
              </View>
            ))}
          </View>
        )}
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
});
