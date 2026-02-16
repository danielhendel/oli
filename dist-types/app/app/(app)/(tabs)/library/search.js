import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
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
const PROVENANCE_OPTIONS = ["manual", "device", "upload", "backfill", "correction"];
const UNCERTAINTY_OPTIONS = ["complete", "incomplete", "uncertain"];
function formatIsoToShort(iso) {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime()))
        return iso;
    return d.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" });
}
export default function LibrarySearchScreen() {
    const params = useLocalSearchParams();
    const [keyword, setKeyword] = useState("");
    const [start, setStart] = useState("");
    const [end, setEnd] = useState("");
    const [provenanceFilter, setProvenanceFilter] = useState([]);
    const [uncertaintyFilter, setUncertaintyFilter] = useState([]);
    const [unresolvedLens, setUnresolvedLens] = useState(false);
    // Sprint 4 — Apply quick lens params from navigation
    useEffect(() => {
        if (params.unresolvedLens === "1")
            setUnresolvedLens(true);
        if (params.uncertaintyFilter === "uncertain")
            setUncertaintyFilter(["uncertain"]);
        if (params.provenanceFilter === "correction")
            setProvenanceFilter(["correction"]);
    }, [params.unresolvedLens, params.uncertaintyFilter, params.provenanceFilter]);
    const [resolveModalOpen, setResolveModalOpen] = useState(false);
    const [resolveTarget, setResolveTarget] = useState(null);
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
        if (unresolvedLens)
            return ["incomplete", "uncertain"];
        return uncertaintyFilter;
    }, [unresolvedLens, uncertaintyFilter]);
    const rawEvents = useRawEvents({
        start: range.start,
        end: range.end,
        ...(keyword.trim() ? { q: keyword.trim() } : {}),
        ...(provenanceFilter.length > 0 ? { provenance: provenanceFilter } : {}),
        ...(effectiveUncertainty.length > 0 ? { uncertaintyState: effectiveUncertainty } : {}),
        limit: 50,
    }, { enabled: true });
    const openResolve = useCallback((ev) => {
        if (ev.kind !== "incomplete")
            return;
        setResolveTarget(ev);
        setResolveNote("");
        setResolveModalOpen(true);
    }, []);
    const submitResolve = useCallback(async () => {
        if (!resolveTarget || !resolveNote.trim())
            return;
        setResolveSubmitting(true);
        const token = await getIdToken(false);
        if (!token) {
            setResolveSubmitting(false);
            return;
        }
        const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
        const result = await ingestRawEventAuthed({
            provider: "manual",
            kind: "incomplete",
            observedAt: resolveTarget.observedAt,
            timeZone: tz,
            payload: { note: resolveNote.trim().slice(0, 256) },
            provenance: "correction",
            correctionOfRawEventId: resolveTarget.id,
        }, token, { idempotencyKey: `correction_${resolveTarget.id}_note_${Date.now()}` });
        setResolveSubmitting(false);
        if (result.ok) {
            setResolveModalOpen(false);
            setResolveTarget(null);
            rawEvents.refetch();
        }
    }, [resolveTarget, resolveNote, getIdToken, rawEvents]);
    const toggleProvenance = (p) => {
        setProvenanceFilter((prev) => prev.includes(p) ? prev.filter((x) => x !== p) : [...prev, p]);
    };
    const toggleUncertainty = (u) => {
        setUncertaintyFilter((prev) => prev.includes(u) ? prev.filter((x) => x !== u) : [...prev, u]);
    };
    if (rawEvents.status === "partial") {
        return (_jsx(ScreenContainer, { children: _jsx(LoadingState, { message: "Loading search\u2026" }) }));
    }
    if (rawEvents.status === "error") {
        return (_jsx(ScreenContainer, { children: _jsx(ErrorState, { message: rawEvents.error, requestId: rawEvents.requestId, onRetry: () => rawEvents.refetch() }) }));
    }
    const items = rawEvents.data.items;
    return (_jsx(ScreenContainer, { children: _jsxs(ScrollView, { contentContainerStyle: styles.scroll, children: [_jsx(Text, { style: styles.title, children: "Search" }), _jsx(Text, { style: styles.subtitle, children: "Keyword, time range, uncertainty, provenance" }), _jsx(TextInput, { style: styles.input, placeholder: "Keyword (id or note)", value: keyword, onChangeText: setKeyword }), _jsxs(View, { style: styles.dateRow, children: [_jsx(TextInput, { style: [styles.input, styles.dateInput], placeholder: "Start YYYY-MM-DD", value: start, onChangeText: setStart }), _jsx(TextInput, { style: [styles.input, styles.dateInput], placeholder: "End YYYY-MM-DD", value: end, onChangeText: setEnd })] }), _jsx(Pressable, { style: [styles.unresolvedLens, unresolvedLens && styles.unresolvedLensActive], onPress: () => setUnresolvedLens(!unresolvedLens), children: _jsx(Text, { style: [
                            styles.unresolvedLensText,
                            unresolvedLens && styles.unresolvedLensTextActive,
                        ], children: "Unresolved items (incomplete / uncertain)" }) }), _jsx(Text, { style: styles.filterLabel, children: "Provenance" }), _jsx(View, { style: styles.chipRow, children: PROVENANCE_OPTIONS.map((p) => (_jsx(Pressable, { style: [
                            styles.chip,
                            provenanceFilter.includes(p) && styles.chipActive,
                        ], onPress: () => toggleProvenance(p), children: _jsx(Text, { style: [
                                styles.chipText,
                                provenanceFilter.includes(p) && styles.chipTextActive,
                            ], children: p }) }, p))) }), _jsx(Text, { style: styles.filterLabel, children: "Uncertainty" }), _jsx(View, { style: styles.chipRow, children: UNCERTAINTY_OPTIONS.map((u) => (_jsx(Pressable, { style: [
                            styles.chip,
                            uncertaintyFilter.includes(u) && styles.chipActive,
                        ], onPress: () => toggleUncertainty(u), children: _jsx(Text, { style: [
                                styles.chipText,
                                uncertaintyFilter.includes(u) && styles.chipTextActive,
                            ], children: u }) }, u))) }), _jsxs(Text, { style: styles.resultsLabel, children: [items.length, " result", items.length !== 1 ? "s" : ""] }), items.length === 0 ? (_jsx(EmptyState, { title: "No matches", description: "Try adjusting filters or keyword." })) : (_jsx(View, { style: styles.list, children: items.map((ev) => (_jsxs(Pressable, { style: styles.row, onPress: () => ev.kind === "incomplete" && openResolve(ev), children: [_jsx(Text, { style: styles.rowKind, children: ev.kind }), _jsx(Text, { style: styles.rowTime, children: formatIsoToShort(ev.observedAt) }), ev.provenance && (_jsx(Text, { style: styles.rowMeta, children: ev.provenance })), ev.correctionOfRawEventId && (_jsxs(Text, { style: styles.rowCorrection, children: ["corrects ", ev.correctionOfRawEventId] })), ev.kind === "incomplete" && (_jsx(Text, { style: styles.resolveHint, children: "Resolve" }))] }, ev.id))) })), _jsx(Modal, { visible: resolveModalOpen, transparent: true, animationType: "fade", onRequestClose: () => setResolveModalOpen(false), children: _jsx(Pressable, { style: styles.modalOverlay, onPress: () => setResolveModalOpen(false), children: _jsxs(Pressable, { style: styles.modalContent, onPress: (e) => e.stopPropagation(), children: [_jsx(Text, { style: styles.modalTitle, children: "Resolve incomplete" }), _jsx(Text, { style: styles.modalSubtitle, children: "Add missing details. Original record is preserved." }), _jsx(TextInput, { style: styles.resolveInput, placeholder: "Note (what happened)", value: resolveNote, onChangeText: setResolveNote }), _jsxs(View, { style: styles.modalButtons, children: [_jsx(Pressable, { style: styles.modalBtn, onPress: () => setResolveModalOpen(false), children: _jsx(Text, { style: styles.modalBtnText, children: "Cancel" }) }), _jsx(Pressable, { style: [styles.modalBtn, styles.modalBtnPrimary], onPress: submitResolve, disabled: resolveSubmitting || !resolveNote.trim(), children: _jsx(Text, { style: styles.modalBtnTextPrimary, children: resolveSubmitting ? "…" : "Add note" }) })] })] }) }) })] }) }));
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
