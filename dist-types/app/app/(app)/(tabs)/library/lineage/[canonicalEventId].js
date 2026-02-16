import { jsxs as _jsxs, jsx as _jsx, Fragment as _Fragment } from "react/jsx-runtime";
// app/(app)/(tabs)/library/lineage/[canonicalEventId].tsx
// Sprint 4 — Lineage & Explainability UI
// Every data point explainable: raw → canonical → derived with "why this value exists" narrative.
import { ScrollView, View, Text, StyleSheet, Pressable } from "react-native";
import { useLocalSearchParams } from "expo-router";
import { ScreenContainer, LoadingState, ErrorState } from "@/lib/ui/ScreenStates";
import { useLineage } from "@/lib/data/useLineage";
import { useEvents } from "@/lib/data/useEvents";
import { useFailures } from "@/lib/data/useFailures";
import { useMemo, useState } from "react";
function formatIso(iso) {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime()))
        return iso;
    return d.toLocaleString();
}
function LineageSection({ title, children, defaultExpanded = false }) {
    const [expanded, setExpanded] = useState(defaultExpanded);
    return (_jsxs(View, { style: styles.section, children: [_jsx(Pressable, { style: styles.sectionToggle, onPress: () => setExpanded(!expanded), children: _jsxs(Text, { style: styles.sectionToggleText, children: [expanded ? "▼" : "▶", " ", title] }) }), expanded && _jsx(View, { style: styles.sectionContent, children: children })] }));
}
export default function LineageScreen() {
    const params = useLocalSearchParams();
    const canonicalEventId = params.canonicalEventId ?? "";
    const range = useMemo(() => {
        const end = new Date();
        const start = new Date();
        start.setDate(start.getDate() - 365);
        return {
            start: start.toISOString().slice(0, 10),
            end: end.toISOString().slice(0, 10),
        };
    }, []);
    const lineage = useLineage({ canonicalEventId }, { enabled: !!canonicalEventId });
    const events = useEvents({ start: range.start, end: range.end, limit: 500 }, { enabled: !!canonicalEventId && lineage.status === "ready" });
    const canonicalEvent = useMemo(() => {
        if (events.status !== "ready")
            return null;
        return events.data.items.find((e) => e.id === canonicalEventId) ?? null;
    }, [events, canonicalEventId]);
    const failures = useFailures({ day: canonicalEvent?.day ?? "" }, { enabled: !!canonicalEvent?.day });
    const hasFailures = failures.status === "ready" && failures.data.items.length > 0;
    const hasAnomalies = (lineage.status === "ready" && lineage.data.rawEventIds.length === 0) ||
        (lineage.status === "ready" && !lineage.data.canonicalEventId);
    const autoExpandProvenance = hasFailures || hasAnomalies;
    const isContractError = lineage.status === "error" && lineage.reason === "contract";
    // Fail-closed: contract mismatch → ErrorState, no partial render
    if (lineage.status === "error" && isContractError) {
        return (_jsx(ScreenContainer, { children: _jsx(ErrorState, { message: lineage.error, requestId: lineage.requestId, onRetry: () => lineage.refetch(), isContractError: true }) }));
    }
    if (!canonicalEventId) {
        return (_jsx(ScreenContainer, { children: _jsx(ErrorState, { message: "Missing event ID" }) }));
    }
    if (lineage.status === "partial" || lineage.status === "missing") {
        return (_jsx(ScreenContainer, { children: _jsx(LoadingState, { message: "Loading lineage\u2026" }) }));
    }
    if (lineage.status === "error") {
        return (_jsx(ScreenContainer, { children: _jsx(ErrorState, { message: lineage.error, requestId: lineage.requestId, onRetry: () => lineage.refetch(), isContractError: false }) }));
    }
    const lineageData = lineage.data;
    const hasDerivedLedgerDay = lineageData.derivedLedgerRuns.length > 0;
    // Fail-closed: missing required references → FailureState (canonicalEventId required)
    const missingCanonical = !lineageData.canonicalEventId;
    if (missingCanonical) {
        return (_jsx(ScreenContainer, { children: _jsxs(View, { style: styles.stateContainer, children: [_jsx(Text, { style: styles.errorTitle, children: "Lineage incomplete" }), _jsx(Text, { style: styles.errorMessage, children: "Canonical event reference is missing. This may indicate a data consistency issue." }), _jsx(Text, { style: styles.failureHint, children: "Report issue or view failures." })] }) }));
    }
    return (_jsx(ScreenContainer, { children: _jsxs(ScrollView, { contentContainerStyle: styles.scroll, children: [_jsx(Text, { style: styles.title, children: "Lineage" }), _jsx(Text, { style: styles.subtitle, children: "Why this value exists" }), _jsx(LineageSection, { title: "Canonical Event", defaultExpanded: autoExpandProvenance, children: canonicalEvent ? (_jsxs(View, { style: styles.card, children: [_jsx(Text, { style: styles.fieldLabel, children: "Kind" }), _jsx(Text, { style: styles.fieldValue, children: canonicalEvent.kind }), _jsx(Text, { style: styles.fieldLabel, children: "Time" }), _jsx(Text, { style: styles.fieldValue, children: formatIso(canonicalEvent.start) }), _jsx(Text, { style: styles.fieldLabel, children: "Day" }), _jsx(Text, { style: styles.fieldValue, children: canonicalEvent.day }), _jsx(Text, { style: styles.fieldLabel, children: "Timezone" }), _jsx(Text, { style: styles.fieldValue, children: canonicalEvent.timezone }), _jsx(Text, { style: styles.fieldLabel, children: "Source" }), _jsx(Text, { style: styles.fieldValue, children: canonicalEvent.sourceId }), _jsx(Text, { style: styles.fieldLabel, children: "ID" }), _jsx(Text, { style: styles.fieldValue, children: lineageData.canonicalEventId ?? "—" })] })) : (_jsxs(Text, { style: styles.fieldValue, children: ["ID: ", lineageData.canonicalEventId ?? "—"] })) }), _jsx(LineageSection, { title: "Raw Events", defaultExpanded: autoExpandProvenance, children: _jsx(View, { style: styles.card, children: lineageData.rawEventIds.length > 0 ? (lineageData.rawEventIds.map((id) => (_jsx(View, { style: styles.rawEventRow, children: _jsx(Text, { style: styles.rawEventId, children: id }) }, id)))) : (_jsx(Text, { style: styles.fieldValue, children: "No raw event IDs (orphaned or fact-only)" })) }) }), _jsx(LineageSection, { title: "Derived", defaultExpanded: autoExpandProvenance, children: _jsxs(View, { style: styles.card, children: [_jsx(Text, { style: styles.fieldLabel, children: "Ledger day presence" }), _jsx(Text, { style: styles.fieldValue, children: hasDerivedLedgerDay ? "Yes" : "No" }), lineageData.derivedLedgerRuns.length > 0 && (_jsxs(_Fragment, { children: [_jsx(Text, { style: styles.fieldLabel, children: "Runs" }), _jsx(Text, { style: styles.fieldValue, children: lineageData.derivedLedgerRuns
                                            .map((r) => `${r.day} / ${r.runId}`)
                                            .join("; ") }), _jsx(Text, { style: styles.derivedHint, children: "Endpoints: runs, replay, snapshot (Sprint 5)" })] }))] }) }), _jsx(LineageSection, { title: "Narrative", defaultExpanded: true, children: _jsx(Text, { style: styles.narrative, children: buildNarrative(lineageData, canonicalEvent, hasDerivedLedgerDay) }) })] }) }));
}
function buildNarrative(lineage, canonicalEvent, hasDerivedLedgerDay) {
    const parts = [];
    if (canonicalEvent) {
        parts.push(`This canonical ${canonicalEvent.kind} event was created from ${lineage.rawEventIds.length} raw event(s).`);
    }
    else {
        parts.push("Canonical event reference present.");
    }
    if (lineage.rawEventIds.length > 0) {
        parts.push(`Raw event IDs: ${lineage.rawEventIds.join(", ")}.`);
    }
    if (hasDerivedLedgerDay) {
        const days = lineage.derivedLedgerRuns.map((r) => r.day);
        parts.push(`Derived ledger exists for day(s): ${days.join(", ")}.`);
    }
    else {
        parts.push("No derived ledger runs for this event.");
    }
    return parts.join(" ");
}
const styles = StyleSheet.create({
    scroll: { padding: 16, paddingBottom: 40 },
    title: { fontSize: 28, fontWeight: "900", color: "#1C1C1E" },
    subtitle: { fontSize: 15, color: "#8E8E93", marginTop: 4 },
    section: { marginTop: 20 },
    sectionToggle: {
        padding: 12,
        backgroundColor: "#F2F2F7",
        borderRadius: 12,
    },
    sectionToggleText: { fontSize: 15, fontWeight: "600", color: "#1C1C1E" },
    sectionContent: { marginTop: 8 },
    card: {
        padding: 12,
        backgroundColor: "#F9F9FB",
        borderRadius: 12,
        gap: 8,
    },
    fieldLabel: { fontSize: 13, fontWeight: "600", color: "#8E8E93", marginTop: 8 },
    fieldValue: { fontSize: 15, color: "#1C1C1E", lineHeight: 20 },
    rawEventRow: { paddingVertical: 4 },
    rawEventId: { fontSize: 14, fontFamily: "monospace", color: "#1C1C1E" },
    derivedHint: { fontSize: 12, color: "#8E8E93", marginTop: 8 },
    narrative: {
        fontSize: 15,
        color: "#3C3C43",
        lineHeight: 22,
        padding: 12,
    },
    stateContainer: {
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
        padding: 24,
        gap: 12,
    },
    errorTitle: {
        fontSize: 17,
        fontWeight: "700",
        color: "#1C1C1E",
        textAlign: "center",
    },
    errorMessage: {
        fontSize: 15,
        color: "#3C3C43",
        opacity: 0.8,
        textAlign: "center",
        lineHeight: 22,
    },
    failureHint: {
        fontSize: 13,
        color: "#8E8E93",
        marginTop: 8,
    },
});
