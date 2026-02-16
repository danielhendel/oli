import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
// app/(app)/(tabs)/dash.tsx
// Phase 1.5 Sprint 2 — Command Center: Health Score surface (read-only, trust-first)
// Phase 1.5 Sprint 5 — Epistemic transparency: ProvenanceDrawer for Health Score + Signals
import { ScrollView, View, Text, StyleSheet, Pressable } from "react-native";
import { useRouter } from "expo-router";
import { ScreenContainer, LoadingState, ErrorState, EmptyState } from "@/lib/ui/ScreenStates";
import { OfflineState } from "@/lib/ui/StateBlock";
import { BaselineDrawer } from "@/lib/ui/BaselineDrawer";
import { ProvenanceDrawer } from "@/lib/ui/ProvenanceDrawer";
import { useFailuresRange } from "@/lib/data/useFailuresRange";
import { useUploadsPresence } from "@/lib/data/useUploadsPresence";
import { useTimeline } from "@/lib/data/useTimeline";
import { useHealthScore } from "@/lib/data/useHealthScore";
import { useHealthSignals } from "@/lib/data/useHealthSignals";
import { formatHealthScoreTier, formatHealthScoreStatus, formatMissingList, } from "@/lib/format/healthScore";
import { getTodayDayKey } from "@/lib/time/dayKey";
import { useMemo, useState } from "react";
function formatIsoToLocal(iso) {
    if (!iso)
        return "—";
    const ms = Date.parse(iso);
    if (!Number.isFinite(ms))
        return "—";
    return new Date(ms).toLocaleDateString();
}
const DOMAIN_ORDER = [
    "recovery",
    "training",
    "nutrition",
    "body",
];
const DOMAIN_LABELS = {
    recovery: "Recovery",
    training: "Training",
    nutrition: "Nutrition",
    body: "Body",
};
const DERIVED_FROM_DAILY_FACTS = "Derived from DailyFacts";
const DERIVED_FROM_HEALTHSCORE_BASELINE = "Derived from HealthScore + Baseline window";
function healthScoreToProvenanceViewModel(doc) {
    const missing = [
        ...doc.domainScores.recovery.missing,
        ...doc.domainScores.training.missing,
        ...doc.domainScores.nutrition.missing,
        ...doc.domainScores.body.missing,
    ];
    const missingInputs = [...new Set(missing)];
    return {
        title: "Health Score provenance",
        modelVersion: doc.modelVersion,
        computedAt: doc.computedAt,
        pipelineVersion: doc.pipelineVersion,
        missingInputs,
        derivedFromLabel: DERIVED_FROM_DAILY_FACTS,
    };
}
function healthSignalToProvenanceViewModel(doc) {
    return {
        title: "Signals provenance",
        modelVersion: doc.modelVersion,
        computedAt: doc.computedAt,
        pipelineVersion: doc.pipelineVersion,
        missingInputs: [...doc.missingInputs],
        thresholds: doc.inputs.thresholds,
        derivedFromLabel: DERIVED_FROM_HEALTHSCORE_BASELINE,
    };
}
function HealthScoreSection() {
    const todayKey = useMemo(() => getTodayDayKey(), []);
    const healthScore = useHealthScore(todayKey);
    const [baselineDrawerVisible, setBaselineDrawerVisible] = useState(false);
    const [provenanceDrawerVisible, setProvenanceDrawerVisible] = useState(false);
    if (healthScore.status === "partial") {
        return (_jsxs(View, { style: styles.healthScoreSection, children: [_jsx(Text, { style: styles.healthScoreHeading, children: "Health Score" }), _jsx(LoadingState, { message: "Loading\u2026" })] }));
    }
    if (healthScore.status === "missing") {
        return (_jsxs(View, { style: styles.healthScoreSection, children: [_jsx(Text, { style: styles.healthScoreHeading, children: "Health Score" }), _jsx(EmptyState, { title: "Health Score not available", description: "No Health Score has been computed for this day.", explanation: "Health Score is derived server-side from available inputs." })] }));
    }
    if (healthScore.status === "error") {
        const isOffline = healthScore.reason === "network";
        return (_jsxs(View, { style: styles.healthScoreSection, children: [_jsx(Text, { style: styles.healthScoreHeading, children: "Health Score" }), isOffline ? (_jsx(OfflineState, { title: "Offline", message: "Health Score will load when connection is restored." })) : (_jsx(ErrorState, { message: healthScore.error, requestId: healthScore.requestId, onRetry: () => healthScore.refetch(), isContractError: healthScore.reason === "contract" }))] }));
    }
    const d = healthScore.data;
    return (_jsxs(View, { style: styles.healthScoreSection, children: [_jsx(Text, { style: styles.healthScoreHeading, children: "Health Score" }), _jsxs(View, { style: styles.compositeBlock, children: [_jsx(Text, { style: styles.compositeScore, children: d.compositeScore }), _jsx(Text, { style: styles.compositeTier, children: formatHealthScoreTier(d.compositeTier) })] }), _jsxs(Text, { style: styles.statusLine, children: ["Status: ", formatHealthScoreStatus(d.status)] }), _jsx(View, { style: styles.domainList, children: DOMAIN_ORDER.map((key) => {
                    const domain = d.domainScores[key];
                    const missingStr = formatMissingList(domain.missing);
                    return (_jsxs(View, { style: styles.domainRow, children: [_jsxs(View, { style: styles.domainRowMain, children: [_jsx(Text, { style: styles.domainLabel, children: DOMAIN_LABELS[key] }), _jsxs(Text, { style: styles.domainValue, children: [domain.score, " \u2014 ", formatHealthScoreTier(domain.tier)] })] }), missingStr ? (_jsx(Text, { style: styles.domainMissing, children: missingStr })) : null] }, key));
                }) }), _jsx(View, { style: styles.metadata, children: _jsxs(Text, { style: styles.metadataText, children: ["Model ", d.modelVersion, " \u00B7 Computed ", formatIsoToLocal(d.computedAt)] }) }), _jsxs(View, { style: styles.drawerTriggers, children: [_jsx(Pressable, { style: styles.baselineTrigger, onPress: () => setBaselineDrawerVisible(true), accessibilityLabel: "View baselines", accessibilityRole: "button", children: _jsx(Text, { style: styles.link, children: "View baselines" }) }), _jsx(Pressable, { style: styles.baselineTrigger, onPress: () => setProvenanceDrawerVisible(true), accessibilityLabel: "Health Score details and provenance", accessibilityRole: "button", children: _jsx(Text, { style: styles.link, children: "Details" }) })] }), _jsx(BaselineDrawer, { visible: baselineDrawerVisible, onClose: () => setBaselineDrawerVisible(false), doc: d }), _jsx(ProvenanceDrawer, { visible: provenanceDrawerVisible, onClose: () => setProvenanceDrawerVisible(false), model: healthScoreToProvenanceViewModel(d) })] }));
}
function HealthSignalsSection() {
    const todayKey = useMemo(() => getTodayDayKey(), []);
    const signals = useHealthSignals(todayKey);
    const [provenanceDrawerVisible, setProvenanceDrawerVisible] = useState(false);
    if (signals.status === "partial") {
        return (_jsxs(View, { style: styles.signalsSection, children: [_jsx(Text, { style: styles.signalsHeading, children: "What matters now" }), _jsx(LoadingState, { message: "Loading\u2026" })] }));
    }
    if (signals.status === "missing") {
        return (_jsxs(View, { style: styles.signalsSection, children: [_jsx(Text, { style: styles.signalsHeading, children: "What matters now" }), _jsx(EmptyState, { title: "Signals not available", description: "No health signals have been computed for this day.", explanation: "Signals are derived server-side from Health Score and baseline history." })] }));
    }
    if (signals.status === "error") {
        const isOffline = signals.reason === "network";
        return (_jsxs(View, { style: styles.signalsSection, children: [_jsx(Text, { style: styles.signalsHeading, children: "What matters now" }), isOffline ? (_jsx(OfflineState, { title: "Offline", message: "Signals will load when connection is restored." })) : (_jsx(ErrorState, { message: signals.error, requestId: signals.requestId, onRetry: () => signals.refetch(), isContractError: signals.reason === "contract" }))] }));
    }
    const d = signals.data;
    const statusLabel = d.status === "stable" ? "Stable" : "Attention Required";
    return (_jsxs(View, { style: styles.signalsSection, children: [_jsx(Text, { style: styles.signalsHeading, children: "What matters now" }), _jsxs(Text, { style: styles.signalStatusLine, children: ["Status: ", statusLabel] }), _jsx(View, { style: styles.metadata, children: _jsxs(Text, { style: styles.metadataText, children: ["Model ", d.modelVersion, " \u00B7 Computed ", formatIsoToLocal(d.computedAt)] }) }), _jsx(Pressable, { style: styles.baselineTrigger, onPress: () => setProvenanceDrawerVisible(true), accessibilityLabel: "Analyze signals and view provenance", accessibilityRole: "button", children: _jsx(Text, { style: styles.link, children: "Analyze" }) }), _jsx(ProvenanceDrawer, { visible: provenanceDrawerVisible, onClose: () => setProvenanceDrawerVisible(false), model: healthSignalToProvenanceViewModel(d) })] }));
}
export default function DashScreen() {
    const router = useRouter();
    const todayKey = useMemo(() => getTodayDayKey(), []);
    const failuresPresence = useFailuresRange({ start: "1970-01-01", end: todayKey, limit: 5 }, { mode: "page" });
    const uploadsPresence = useUploadsPresence();
    const timeline = useTimeline({ start: todayKey, end: todayKey }, { enabled: true });
    const failuresCount = failuresPresence.status === "ready" ? failuresPresence.data.items.length : null;
    const uploadsWaiting = uploadsPresence.status === "ready" ? uploadsPresence.data.count : null;
    const lastSync = uploadsPresence.status === "ready" && uploadsPresence.data.latest
        ? formatIsoToLocal(uploadsPresence.data.latest.receivedAt)
        : null;
    const todayEvents = timeline.status === "ready" && timeline.data.days[0]
        ? timeline.data.days[0].canonicalCount
        : null;
    return (_jsx(ScreenContainer, { children: _jsxs(ScrollView, { contentContainerStyle: styles.scroll, children: [_jsx(Text, { style: styles.title, children: "System status" }), _jsx(Text, { style: styles.subtitle, children: "Contextual counts only \u2014 no metrics" }), _jsxs(View, { style: styles.section, children: [_jsxs(View, { style: styles.row, children: [_jsx(Text, { style: styles.label, children: "Failures needing review" }), _jsx(Text, { style: styles.value, children: failuresPresence.status === "partial"
                                        ? "…"
                                        : typeof failuresCount === "number"
                                            ? String(failuresCount)
                                            : "—" })] }), _jsxs(View, { style: styles.row, children: [_jsx(Text, { style: styles.label, children: "Uploads waiting" }), _jsx(Text, { style: styles.value, children: uploadsPresence.status === "partial"
                                        ? "…"
                                        : typeof uploadsWaiting === "number"
                                            ? String(uploadsWaiting)
                                            : "—" })] }), _jsxs(View, { style: styles.row, children: [_jsx(Text, { style: styles.label, children: "Last sync" }), _jsx(Text, { style: styles.value, children: lastSync ?? "—" })] }), _jsxs(View, { style: styles.row, children: [_jsx(Text, { style: styles.label, children: "Today's events" }), _jsx(Text, { style: styles.value, children: timeline.status === "partial"
                                        ? "…"
                                        : typeof todayEvents === "number"
                                            ? String(todayEvents)
                                            : "—" })] })] }), _jsx(HealthScoreSection, {}), _jsx(HealthSignalsSection, {}), _jsxs(View, { style: styles.actions, children: [_jsx(Pressable, { style: styles.actionPressable, onPress: () => router.push("/(app)/failures"), accessibilityLabel: "View failures", accessibilityRole: "button", children: _jsx(Text, { style: styles.link, children: "View failures" }) }), _jsx(Pressable, { style: styles.actionPressable, onPress: () => router.push("/(app)/command-center"), accessibilityLabel: "Command Center (legacy)", accessibilityRole: "button", children: _jsx(Text, { style: styles.link, children: "Command Center (legacy)" }) })] })] }) }));
}
const styles = StyleSheet.create({
    scroll: { padding: 16, paddingBottom: 40 },
    title: { fontSize: 28, fontWeight: "900", color: "#1C1C1E" },
    subtitle: { fontSize: 15, color: "#8E8E93", marginTop: 4 },
    section: {
        marginTop: 24,
        backgroundColor: "#F2F2F7",
        borderRadius: 16,
        padding: 16,
        gap: 12,
    },
    row: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
    label: { fontSize: 15, color: "#3C3C43" },
    value: { fontSize: 15, fontWeight: "600", color: "#1C1C1E" },
    healthScoreSection: {
        marginTop: 24,
        backgroundColor: "#F2F2F7",
        borderRadius: 16,
        padding: 16,
        gap: 12,
    },
    healthScoreHeading: { fontSize: 17, fontWeight: "700", color: "#1C1C1E" },
    compositeBlock: {
        alignItems: "center",
        paddingVertical: 8,
    },
    compositeScore: { fontSize: 48, fontWeight: "900", color: "#1C1C1E" },
    compositeTier: { fontSize: 20, fontWeight: "600", color: "#3C3C43", marginTop: 4 },
    statusLine: { fontSize: 15, color: "#3C3C43" },
    domainList: { gap: 8 },
    domainRow: { gap: 2 },
    domainRowMain: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
    domainLabel: { fontSize: 15, color: "#3C3C43" },
    domainValue: { fontSize: 15, fontWeight: "600", color: "#1C1C1E" },
    domainMissing: { fontSize: 12, color: "#8E8E93", marginLeft: 0 },
    metadata: { marginTop: 8, paddingTop: 8, borderTopWidth: 1, borderTopColor: "#C6C6C8" },
    metadataText: { fontSize: 12, color: "#8E8E93" },
    drawerTriggers: { marginTop: 8, flexDirection: "row", gap: 16 },
    baselineTrigger: { marginTop: 8, minHeight: 44, justifyContent: "center" },
    signalsSection: {
        marginTop: 24,
        backgroundColor: "#F2F2F7",
        borderRadius: 16,
        padding: 16,
        gap: 12,
    },
    signalsHeading: { fontSize: 17, fontWeight: "700", color: "#1C1C1E" },
    signalStatusLine: { fontSize: 15, color: "#3C3C43" },
    actions: { marginTop: 24, gap: 12 },
    actionPressable: { minHeight: 44, justifyContent: "center" },
    link: { fontSize: 15, color: "#007AFF", fontWeight: "600" },
});
