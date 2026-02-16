import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
// app/(app)/event/[id].tsx
import { ScrollView, View, Text, StyleSheet, Pressable } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { ScreenContainer } from "@/lib/ui/ScreenStates";
import { LoadingState, ErrorState } from "@/lib/ui/ScreenStates";
import { useEvents } from "@/lib/data/useEvents";
import { useLineage } from "@/lib/data/useLineage";
import { useFailures } from "@/lib/data/useFailures";
import { useMemo, useState } from "react";
function formatIso(iso) {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime()))
        return iso;
    return d.toLocaleString();
}
export default function EventDetailScreen() {
    const params = useLocalSearchParams();
    const router = useRouter();
    const eventId = params.id ?? "";
    const [provenanceExpanded, setProvenanceExpanded] = useState(false);
    const range = useMemo(() => {
        const end = new Date();
        const start = new Date();
        start.setDate(start.getDate() - 365);
        return {
            start: start.toISOString().slice(0, 10),
            end: end.toISOString().slice(0, 10),
        };
    }, []);
    const events = useEvents({ start: range.start, end: range.end, limit: 500 }, { enabled: !!eventId });
    const event = useMemo(() => {
        if (events.status !== "ready")
            return null;
        return events.data.items.find((e) => e.id === eventId) ?? null;
    }, [events, eventId]);
    const lineage = useLineage({ canonicalEventId: eventId }, { enabled: !!eventId });
    const failures = useFailures({ day: event?.day ?? "" }, { enabled: !!event?.day });
    const hasFailures = failures.status === "ready" && failures.data.items.length > 0;
    const autoExpandProvenance = provenanceExpanded || hasFailures;
    const isContractError = (events.status === "error" &&
        (events.error?.toLowerCase().includes("invalid") ?? false)) ||
        (lineage.status === "error" &&
            (lineage.error?.toLowerCase().includes("invalid") ?? false));
    if (!eventId) {
        return (_jsx(ScreenContainer, { children: _jsx(ErrorState, { message: "Missing event ID" }) }));
    }
    if (events.status === "partial" || (event && lineage.status === "partial")) {
        return (_jsx(ScreenContainer, { children: _jsx(LoadingState, { message: "Loading event\u2026" }) }));
    }
    if (events.status === "error") {
        return (_jsx(ScreenContainer, { children: _jsx(ErrorState, { message: events.error, requestId: events.requestId, onRetry: () => events.refetch(), isContractError: isContractError }) }));
    }
    if (!event) {
        return (_jsx(ScreenContainer, { children: _jsx(ErrorState, { message: "Event not found" }) }));
    }
    if (lineage.status === "error") {
        return (_jsx(ScreenContainer, { children: _jsx(ErrorState, { message: lineage.error, requestId: lineage.requestId, onRetry: () => lineage.refetch(), isContractError: isContractError }) }));
    }
    const lineageData = lineage.status === "ready" ? lineage.data : null;
    const canonicalEventId = event.id;
    return (_jsx(ScreenContainer, { children: _jsxs(ScrollView, { contentContainerStyle: styles.scroll, children: [_jsx(Text, { style: styles.title, children: "Event" }), _jsx(Text, { style: styles.subtitle, children: "Canonical fields + provenance" }), _jsxs(View, { style: styles.section, children: [_jsx(Text, { style: styles.fieldLabel, children: "Kind" }), _jsx(Text, { style: styles.fieldValue, children: event.kind })] }), _jsxs(View, { style: styles.section, children: [_jsx(Text, { style: styles.fieldLabel, children: "Start" }), _jsx(Text, { style: styles.fieldValue, children: formatIso(event.start) })] }), _jsxs(View, { style: styles.section, children: [_jsx(Text, { style: styles.fieldLabel, children: "End" }), _jsx(Text, { style: styles.fieldValue, children: formatIso(event.end) })] }), _jsxs(View, { style: styles.section, children: [_jsx(Text, { style: styles.fieldLabel, children: "Day" }), _jsx(Text, { style: styles.fieldValue, children: event.day })] }), _jsxs(View, { style: styles.section, children: [_jsx(Text, { style: styles.fieldLabel, children: "Source" }), _jsx(Text, { style: styles.fieldValue, children: event.sourceId })] }), _jsx(Pressable, { style: styles.lineageCta, onPress: () => router.push(`/(app)/(tabs)/library/lineage/${canonicalEventId}`), children: _jsx(Text, { style: styles.lineageCtaText, children: "View lineage" }) }), _jsx(Pressable, { style: styles.provenanceToggle, onPress: () => setProvenanceExpanded(!provenanceExpanded), children: _jsxs(Text, { style: styles.provenanceToggleText, children: [autoExpandProvenance ? "▼" : "▶", " Provenance / Lineage"] }) }), autoExpandProvenance && lineageData && (_jsxs(View, { style: styles.provenanceContent, children: [_jsx(Text, { style: styles.provenanceLabel, children: "Raw event IDs" }), _jsx(Text, { style: styles.provenanceValue, children: lineageData.rawEventIds.join(", ") || "—" }), _jsx(Text, { style: styles.provenanceLabel, children: "Canonical event ID" }), _jsx(Text, { style: styles.provenanceValue, children: lineageData.canonicalEventId ?? "—" }), _jsx(Text, { style: styles.provenanceLabel, children: "Derived ledger runs" }), _jsx(Text, { style: styles.provenanceValue, children: lineageData.derivedLedgerRuns.length > 0
                                ? lineageData.derivedLedgerRuns
                                    .map((r) => `${r.day} / ${r.runId}`)
                                    .join("; ")
                                : "—" })] }))] }) }));
}
const styles = StyleSheet.create({
    scroll: { padding: 16, paddingBottom: 40 },
    title: { fontSize: 28, fontWeight: "900", color: "#1C1C1E" },
    subtitle: { fontSize: 15, color: "#8E8E93", marginTop: 4 },
    section: { marginTop: 16 },
    fieldLabel: { fontSize: 13, fontWeight: "600", color: "#8E8E93", marginBottom: 4 },
    fieldValue: { fontSize: 17, color: "#1C1C1E" },
    lineageCta: {
        marginTop: 24,
        padding: 12,
        backgroundColor: "#F2F2F7",
        borderRadius: 12,
    },
    lineageCtaText: { fontSize: 15, fontWeight: "600", color: "#1C1C1E" },
    provenanceToggle: {
        marginTop: 8,
        padding: 12,
        backgroundColor: "#F2F2F7",
        borderRadius: 12,
    },
    provenanceToggleText: { fontSize: 15, fontWeight: "600", color: "#1C1C1E" },
    provenanceContent: { marginTop: 8, padding: 12, gap: 8 },
    provenanceLabel: { fontSize: 13, fontWeight: "600", color: "#8E8E93" },
    provenanceValue: { fontSize: 14, color: "#1C1C1E", lineHeight: 20 },
});
