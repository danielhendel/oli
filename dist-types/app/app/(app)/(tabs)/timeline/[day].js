import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
// app/(app)/(tabs)/timeline/[day].tsx
import { ScrollView, View, Text, StyleSheet, Pressable, Modal, TextInput } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { ScreenContainer } from "@/lib/ui/ScreenStates";
import { LoadingState, ErrorState, EmptyState } from "@/lib/ui/ScreenStates";
import { useEvents } from "@/lib/data/useEvents";
import { useRawEvents } from "@/lib/data/useRawEvents";
import { useFailures } from "@/lib/data/useFailures";
import { useTimeline } from "@/lib/data/useTimeline";
import { useAuth } from "@/lib/auth/AuthProvider";
import { ingestRawEventAuthed } from "@/lib/api/ingest";
import { useMemo, useState, useCallback } from "react";
const YYYY_MM_DD = /^\d{4}-\d{2}-\d{2}$/;
function formatIsoToShort(iso) {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime()))
        return iso;
    return d.toLocaleTimeString(undefined, {
        hour: "2-digit",
        minute: "2-digit",
    });
}
function groupByKind(items) {
    const map = new Map();
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
    const params = useLocalSearchParams();
    const router = useRouter();
    const dayParam = params.day ?? "";
    const day = YYYY_MM_DD.test(dayParam) ? dayParam : "";
    const [provenanceExpanded, setProvenanceExpanded] = useState(false);
    const [resolveModalOpen, setResolveModalOpen] = useState(false);
    const [resolveTarget, setResolveTarget] = useState(null);
    const [resolveType, setResolveType] = useState("weight");
    const [resolveWeight, setResolveWeight] = useState("");
    const [resolveNote, setResolveNote] = useState("");
    const [resolveSubmitting, setResolveSubmitting] = useState(false);
    const { getIdToken } = useAuth();
    const startIso = `${day}T00:00:00.000Z`;
    const endIso = `${day}T23:59:59.999Z`;
    const events = useEvents({ start: startIso, end: endIso, limit: 100 }, { enabled: !!day });
    const rawIncomplete = useRawEvents({ start: startIso, end: endIso, kinds: ["incomplete"], limit: 50 }, { enabled: !!day });
    const failures = useFailures({ day }, { enabled: !!day });
    const timeline = useTimeline({ start: day, end: day }, { enabled: !!day });
    const dayMeta = timeline.status === "ready" && timeline.data.days.length > 0 ? timeline.data.days[0] : null;
    const missingReasons = dayMeta?.missingReasons ?? [];
    const hasFailures = failures.status === "ready" && failures.data.items.length > 0;
    const autoExpandProvenance = useMemo(() => hasFailures || provenanceExpanded, [hasFailures, provenanceExpanded]);
    const isContractError = events.status === "error" && events.reason === "contract";
    if (!day) {
        return (_jsx(ScreenContainer, { children: _jsx(ErrorState, { message: "Invalid day parameter" }) }));
    }
    if (events.status === "partial") {
        return (_jsx(ScreenContainer, { children: _jsx(LoadingState, { message: "Loading day\u2026" }) }));
    }
    if (events.status === "error") {
        return (_jsx(ScreenContainer, { children: _jsx(ErrorState, { message: events.error, requestId: events.requestId, onRetry: () => events.refetch(), isContractError: isContractError }) }));
    }
    const items = events.data.items;
    const grouped = groupByKind(items);
    const incompleteItems = rawIncomplete.status === "ready" ? rawIncomplete.data.items : [];
    const hasIncomplete = incompleteItems.length > 0;
    const openResolve = useCallback((r) => {
        setResolveTarget(r);
        setResolveType("weight");
        setResolveWeight("");
        setResolveNote("");
        setResolveModalOpen(true);
    }, []);
    const submitResolve = useCallback(async () => {
        if (!resolveTarget)
            return;
        const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
        let body;
        if (resolveType === "weight") {
            if (!resolveWeight.trim())
                return;
            const w = parseFloat(resolveWeight.trim());
            if (Number.isNaN(w) || w <= 0)
                return;
            body = {
                provider: "manual",
                kind: "weight",
                observedAt: resolveTarget.observedAt,
                timeZone: tz,
                payload: { time: resolveTarget.observedAt, timezone: tz, weightKg: w },
                provenance: "correction",
                correctionOfRawEventId: resolveTarget.id,
            };
        }
        else if (resolveType === "note") {
            if (!resolveNote.trim())
                return;
            body = {
                provider: "manual",
                kind: "incomplete",
                observedAt: resolveTarget.observedAt,
                timeZone: tz,
                payload: { note: resolveNote.trim().slice(0, 256) },
                provenance: "correction",
                correctionOfRawEventId: resolveTarget.id,
            };
        }
        else {
            // workout
            if (!resolveWeight.trim())
                return;
            const mins = parseInt(resolveWeight.trim(), 10);
            if (Number.isNaN(mins) || mins <= 0)
                return;
            const startIso = resolveTarget.observedAt;
            const endDate = new Date(startIso);
            endDate.setMinutes(endDate.getMinutes() + mins);
            const endIso = endDate.toISOString();
            body = {
                provider: "manual",
                kind: "workout",
                observedAt: startIso,
                timeZone: tz,
                payload: {
                    start: startIso,
                    end: endIso,
                    timezone: tz,
                    sport: "general",
                    durationMinutes: mins,
                },
                provenance: "correction",
                correctionOfRawEventId: resolveTarget.id,
            };
        }
        setResolveSubmitting(true);
        const token = await getIdToken(false);
        if (!token) {
            setResolveSubmitting(false);
            return;
        }
        const idempotencyKey = `correction_${resolveTarget.id}_${resolveType}_${Date.now()}`;
        const result = await ingestRawEventAuthed(body, token, { idempotencyKey });
        setResolveSubmitting(false);
        if (result.ok) {
            setResolveModalOpen(false);
            setResolveTarget(null);
            setResolveWeight("");
            setResolveNote("");
            events.refetch();
            rawIncomplete.refetch();
            timeline.refetch();
        }
    }, [resolveTarget, resolveType, resolveWeight, resolveNote, getIdToken, events, rawIncomplete, timeline]);
    return (_jsx(ScreenContainer, { children: _jsxs(ScrollView, { contentContainerStyle: styles.scroll, children: [_jsx(Text, { style: styles.title, children: day }), _jsx(Text, { style: styles.subtitle, children: "Canonical events, derived presence, failures" }), missingReasons.length > 0 && (_jsx(View, { style: styles.missingReasonsBanner, children: _jsxs(Text, { style: styles.missingReasonsText, children: ["What's missing: ", missingReasons.join("; ")] }) })), hasFailures && (_jsx(View, { style: styles.failuresBanner, children: _jsx(Text, { style: styles.failuresBannerText, children: failures.status === "ready"
                            ? `${failures.data.items.length} failure(s) recorded`
                            : "Failures present" }) })), _jsxs(View, { style: styles.section, children: [_jsx(Text, { style: styles.sectionTitle, children: "Events" }), hasIncomplete && (_jsx(View, { style: styles.incompleteBanner, children: _jsxs(Text, { style: styles.incompleteBannerText, children: [incompleteItems.length, " incomplete (something happened)"] }) })), items.length === 0 && !hasIncomplete ? (_jsx(EmptyState, { title: "No events", description: "No events for this day." })) : (_jsxs(_Fragment, { children: [hasIncomplete && (_jsxs(View, { style: styles.kindGroup, children: [_jsx(Text, { style: styles.kindHeaderIncomplete, children: "incomplete" }), incompleteItems.map((r) => (_jsxs(Pressable, { style: styles.eventRow, onPress: () => openResolve({ id: r.id, observedAt: r.observedAt }), children: [_jsxs(Text, { style: styles.eventTime, children: [formatIsoToShort(r.observedAt), " \u2014 something happened"] }), _jsx(Text, { style: styles.resolveHint, children: "Resolve" })] }, r.id)))] })), Array.from(grouped.entries()).map(([kind, evs]) => (_jsxs(View, { style: styles.kindGroup, children: [_jsx(Text, { style: styles.kindHeader, children: kind }), evs.map((ev) => (_jsx(Pressable, { style: styles.eventRow, onPress: () => router.push({
                                                pathname: "/(app)/event/[id]",
                                                params: { id: ev.id },
                                            }), children: _jsx(Text, { style: styles.eventTime, children: formatIsoToShort(ev.start) }) }, ev.id)))] }, kind)))] }))] }), _jsx(Pressable, { style: styles.replayRow, onPress: () => router.push({
                        pathname: "/(app)/(tabs)/library/replay/day/[dayKey]",
                        params: { dayKey: day },
                    }), children: _jsx(Text, { style: styles.replayRowText, children: "Replay this day" }) }), _jsx(Pressable, { style: styles.provenanceToggle, onPress: () => setProvenanceExpanded(!provenanceExpanded), children: _jsxs(Text, { style: styles.provenanceToggleText, children: [autoExpandProvenance ? "▼" : "▶", " Provenance"] }) }), autoExpandProvenance && (_jsx(View, { style: styles.provenanceContent, children: _jsxs(Text, { style: styles.provenanceText, children: ["Day: ", day, ". Provenance collapsed by default, auto-expanded when failures exist."] }) })), _jsx(Modal, { visible: resolveModalOpen, transparent: true, animationType: "fade", onRequestClose: () => setResolveModalOpen(false), children: _jsx(Pressable, { style: styles.modalOverlay, onPress: () => setResolveModalOpen(false), children: _jsxs(Pressable, { style: styles.modalContent, onPress: (e) => e.stopPropagation(), children: [_jsx(Text, { style: styles.modalTitle, children: "Resolve incomplete" }), _jsx(Text, { style: styles.modalSubtitle, children: "Add missing details. Original record is preserved." }), _jsx(View, { style: styles.resolveTypeRow, children: ["weight", "note", "workout"].map((t) => (_jsx(Pressable, { style: [
                                            styles.resolveTypeChip,
                                            resolveType === t && styles.resolveTypeChipActive,
                                        ], onPress: () => setResolveType(t), children: _jsx(Text, { style: [
                                                styles.resolveTypeChipText,
                                                resolveType === t && styles.resolveTypeChipTextActive,
                                            ], children: t }) }, t))) }), resolveType === "weight" && (_jsx(TextInput, { style: styles.resolveInput, placeholder: "Weight (kg)", value: resolveWeight, onChangeText: setResolveWeight, keyboardType: "decimal-pad" })), resolveType === "note" && (_jsx(TextInput, { style: styles.resolveInput, placeholder: "Note (what happened)", value: resolveNote, onChangeText: setResolveNote })), resolveType === "workout" && (_jsx(TextInput, { style: styles.resolveInput, placeholder: "Duration (minutes)", value: resolveWeight, onChangeText: setResolveWeight, keyboardType: "number-pad" })), _jsxs(View, { style: styles.modalButtons, children: [_jsx(Pressable, { style: styles.modalBtn, onPress: () => setResolveModalOpen(false), children: _jsx(Text, { style: styles.modalBtnText, children: "Cancel" }) }), _jsx(Pressable, { style: [styles.modalBtn, styles.modalBtnPrimary], onPress: submitResolve, disabled: resolveSubmitting ||
                                                (resolveType === "weight" && !resolveWeight.trim()) ||
                                                (resolveType === "note" && !resolveNote.trim()) ||
                                                (resolveType === "workout" && !resolveWeight.trim()), children: _jsx(Text, { style: styles.modalBtnTextPrimary, children: resolveSubmitting
                                                    ? "…"
                                                    : resolveType === "weight"
                                                        ? "Add as weight"
                                                        : resolveType === "note"
                                                            ? "Add note"
                                                            : "Add as workout" }) })] })] }) }) })] }) }));
}
const styles = StyleSheet.create({
    scroll: { padding: 16, paddingBottom: 40 },
    title: { fontSize: 28, fontWeight: "900", color: "#1C1C1E" },
    subtitle: { fontSize: 15, color: "#8E8E93", marginTop: 4 },
    missingReasonsBanner: {
        marginTop: 16,
        padding: 12,
        backgroundColor: "#F2F2F7",
        borderRadius: 12,
    },
    missingReasonsText: { fontSize: 14, color: "#8E8E93", fontStyle: "italic" },
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
    resolveTypeRow: { flexDirection: "row", gap: 8, marginBottom: 16 },
    resolveTypeChip: {
        paddingVertical: 8,
        paddingHorizontal: 14,
        borderRadius: 8,
        backgroundColor: "#F2F2F7",
    },
    resolveTypeChipActive: { backgroundColor: "#007AFF" },
    resolveTypeChipText: { fontSize: 14, fontWeight: "600", color: "#8E8E93" },
    resolveTypeChipTextActive: { color: "#FFFFFF" },
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
