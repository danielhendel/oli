import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
// app/(app)/command-center/index.tsx
import { ScrollView, View, StyleSheet, Pressable, Text } from "react-native";
import { useRouter, useLocalSearchParams } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { useEffect, useRef, useState, useCallback, useMemo } from "react";
import { useFocusEffect } from "@react-navigation/native";
import { ModuleTile } from "@/lib/ui/ModuleTile";
import { CommandCenterHeader } from "@/lib/ui/CommandCenterHeader";
import { COMMAND_CENTER_MODULES } from "@/lib/modules/commandCenterModules";
import { getModuleBadge, isModuleDisabled } from "@/lib/modules/commandCenterReadiness";
import { ProvenanceRow } from "@/lib/ui/ProvenanceRow";
import { getTodayDayKey } from "@/lib/time/dayKey";
import { useDailyFacts } from "@/lib/data/useDailyFacts";
import { useInsights } from "@/lib/data/useInsights";
import { useIntelligenceContext } from "@/lib/data/useIntelligenceContext";
import { useDayTruth } from "@/lib/data/useDayTruth";
import { useFailuresRange } from "@/lib/data/useFailuresRange";
import { isCompatiblePipelineVersion } from "@/lib/data/readiness";
import { resolveReadiness } from "@/lib/data/resolveReadiness";
import { PIPELINE_VERSION } from "@/lib/pipeline/version";
import { subscribeRefresh, consumeRefresh } from "@/lib/navigation/refreshBus";
import { useDerivedLedgerRuns } from "@/lib/data/useDerivedLedgerRuns";
import { useDerivedLedgerReplay } from "@/lib/data/useDerivedLedgerReplay";
const toneLabel = {
    neutral: "Status",
    success: "Ready",
    warning: "Needs input",
    danger: "Error",
};
const toneColor = {
    neutral: "#1C1C1E",
    success: "#1B5E20",
    warning: "#7A4E00",
    danger: "#B00020",
};
const toneBg = {
    neutral: "#F2F2F7",
    success: "#E9F7EC",
    warning: "#FFF5E6",
    danger: "#FDECEC",
};
function formatTodaySummary(input) {
    const parts = [];
    if (typeof input.facts?.steps === "number")
        parts.push(`${input.facts.steps.toLocaleString()} steps`);
    if (typeof input.facts?.sleepMin === "number")
        parts.push(`${Math.round(input.facts.sleepMin)} min sleep`);
    const effectiveWeightKg = typeof input.facts?.weightKg === "number"
        ? input.facts.weightKg
        : typeof input.optimistic?.weightKg === "number"
            ? input.optimistic.weightKg
            : null;
    if (typeof effectiveWeightKg === "number") {
        const suffix = input.isSyncingOptimistic ? " (syncing…)" : "";
        parts.push(`${effectiveWeightKg.toFixed(1)} kg${suffix}`);
    }
    if (typeof input.insightsCount === "number")
        parts.push(`${input.insightsCount} insights`);
    return parts.length ? parts.join(" • ") : "No facts yet — log your first event to start building today.";
}
function formatIsoToHms(iso) {
    if (!iso)
        return "—";
    const ms = Date.parse(iso);
    if (!Number.isFinite(ms))
        return "—";
    const d = new Date(ms);
    const hh = d.getHours().toString().padStart(2, "0");
    const mm = d.getMinutes().toString().padStart(2, "0");
    const ss = d.getSeconds().toString().padStart(2, "0");
    return `${hh}:${mm}:${ss}`;
}
function formatIsoToLocal(iso) {
    const ms = Date.parse(iso);
    if (!Number.isFinite(ms))
        return iso;
    return new Date(ms).toLocaleString();
}
function DevPipelineOverlay(props) {
    if (!__DEV__)
        return null;
    return (_jsxs(View, { style: styles.devOverlay, children: [_jsx(Text, { style: styles.devOverlayTitle, children: "Pipeline timestamps (dev)" }), _jsxs(Text, { style: styles.devOverlayLine, children: ["Canonical: ", formatIsoToHms(props.canonicalAt)] }), _jsxs(Text, { style: styles.devOverlayLine, children: ["Facts: ", formatIsoToHms(props.factsAt)] }), _jsxs(Text, { style: styles.devOverlayLine, children: ["Context: ", formatIsoToHms(props.contextAt)] }), _jsxs(Text, { style: styles.devOverlayLine, children: ["PV: facts ", props.factsPv ?? "—", " / ctx ", props.ctxPv ?? "—", " (expected ", PIPELINE_VERSION, ")"] })] }));
}
function useReplayUi(dayKey) {
    const params = useLocalSearchParams();
    const enabled = __DEV__ && (params.replay === "1" || params.replay === "true");
    const [isOpen, setIsOpen] = useState(false);
    const selectedRunIdParam = typeof params.rid === "string" ? params.rid : null;
    const runsState = useDerivedLedgerRuns(dayKey, { enabled });
    const replayArgs = selectedRunIdParam !== null ? { day: dayKey, runId: selectedRunIdParam } : { day: dayKey };
    const replayState = useDerivedLedgerReplay(replayArgs, { enabled: enabled && Boolean(selectedRunIdParam) });
    useEffect(() => {
        if (!enabled)
            return;
        setIsOpen(true);
    }, [enabled]);
    if (!enabled)
        return { enabled: false };
    return {
        enabled: true,
        isOpen,
        runs: runsState.status === "ready" ? runsState.data : null,
        runsLoading: runsState.status === "loading",
        runsError: runsState.status === "error" ? runsState.error : null,
        selectedRunId: selectedRunIdParam,
        replay: replayState.status === "ready" ? replayState.data : null,
        replayLoading: replayState.status === "loading",
        replayError: replayState.status === "error" ? replayState.error : null,
        replayMissing: replayState.status === "missing",
    };
}
function ReplayPanel(props) {
    const s = props.state;
    if (!s.isOpen)
        return null;
    const items = s.runs?.runs ?? [];
    return (_jsxs(View, { style: styles.replayPanel, children: [_jsxs(View, { style: styles.replayPanelHeaderRow, children: [_jsx(Text, { style: styles.replayPanelTitle, children: "Replay (dev)" }), _jsx(Pressable, { onPress: props.onClose, style: styles.replayCloseBtn, children: _jsx(Text, { style: styles.replayCloseBtnText, children: "Close" }) })] }), s.runsLoading ? _jsx(Text, { style: styles.replayPanelMuted, children: "Loading runs\u2026" }) : null, s.runsError ? _jsxs(Text, { style: styles.replayPanelError, children: ["Runs error: ", s.runsError] }) : null, items.length ? (_jsx(View, { style: styles.replayRunsList, children: items.map((r) => (_jsxs(Pressable, { onPress: () => props.onPickRun(r.runId), style: [styles.replayRunRow, s.selectedRunId === r.runId ? styles.replayRunRowSelected : null], children: [_jsx(Text, { style: styles.replayRunId, numberOfLines: 1, children: r.runId }), _jsxs(Text, { style: styles.replayRunMeta, numberOfLines: 1, children: [r.pipelineVersion ? `PV ${r.pipelineVersion}` : "PV —", " \u2022 ", formatIsoToHms(r.createdAt)] })] }, r.runId))) })) : (_jsx(Text, { style: styles.replayPanelMuted, children: "No derived ledger runs found." })), _jsx(View, { style: styles.replayDivider }), s.selectedRunId ? (_jsxs(View, { children: [_jsxs(Text, { style: styles.replayPanelMuted, children: ["Selected: ", s.selectedRunId] }), s.replayLoading ? _jsx(Text, { style: styles.replayPanelMuted, children: "Replaying\u2026" }) : null, s.replayError ? _jsxs(Text, { style: styles.replayPanelError, children: ["Replay error: ", s.replayError] }) : null, s.replayMissing ? _jsx(Text, { style: styles.replayPanelMuted, children: "Replay missing snapshots for this run." }) : null] })) : (_jsx(Text, { style: styles.replayPanelMuted, children: "Pick a run to overlay snapshots." }))] }));
}
function useReplayOverride(dayKey) {
    const ui = useReplayUi(dayKey);
    if (!ui.enabled)
        return { replayOverride: null, replayLoading: false, replayError: null, replayMissing: false };
    return {
        replayOverride: ui.replay,
        replayLoading: ui.replayLoading,
        replayError: ui.replayError,
        replayMissing: ui.replayMissing,
    };
}
function QuickActionsRow() {
    const router = useRouter();
    return (_jsxs(View, { style: styles.quickActionsRow, children: [_jsxs(Pressable, { onPress: () => router.push("/(app)/body/weight"), style: styles.quickActionBtn, children: [_jsx(Text, { style: styles.quickActionTitle, children: "Log weight" }), _jsx(Text, { style: styles.quickActionSubtitle, children: "Fast entry" })] }), _jsxs(Pressable, { onPress: () => router.push("/(app)/nutrition"), style: styles.quickActionBtn, children: [_jsx(Text, { style: styles.quickActionTitle, children: "Nutrition" }), _jsx(Text, { style: styles.quickActionSubtitle, children: "Overview" })] }), _jsxs(Pressable, { onPress: () => router.push("/(app)/workouts"), style: styles.quickActionBtn, children: [_jsx(Text, { style: styles.quickActionTitle, children: "Training" }), _jsx(Text, { style: styles.quickActionSubtitle, children: "Overview" })] })] }));
}
function FailurePresenceCard(props) {
    const s = props.state;
    if (s.status === "loading") {
        return (_jsxs(Pressable, { onPress: props.onPress, style: [styles.failuresCard, styles.failuresCardNeutral], children: [_jsx(Text, { style: styles.failuresLabel, children: "Failures" }), _jsx(Text, { style: styles.failuresTitle, children: "Checking\u2026" }), _jsx(Text, { style: styles.failuresSubtitle, children: "If failures exist, they will be shown." })] }));
    }
    if (s.status === "error") {
        return (_jsxs(Pressable, { onPress: props.onPress, style: [styles.failuresCard, styles.failuresCardDanger], children: [_jsx(Text, { style: [styles.failuresLabel, styles.failuresDangerText], children: "Failures" }), _jsx(Text, { style: [styles.failuresTitle, styles.failuresDangerText], children: "Failed to load failures" }), _jsxs(Text, { style: styles.failuresSubtitle, children: [s.error, s.requestId ? ` • Request ID: ${s.requestId}` : ""] })] }));
    }
    // ready
    if (!s.hasFailures) {
        return (_jsxs(Pressable, { onPress: props.onPress, style: [styles.failuresCard, styles.failuresCardNeutral], children: [_jsx(Text, { style: styles.failuresLabel, children: "Failures" }), _jsx(Text, { style: styles.failuresTitle, children: "No failures recorded" }), _jsx(Text, { style: styles.failuresSubtitle, children: "No failed, rejected, or missing data has been written." })] }));
    }
    return (_jsxs(Pressable, { onPress: props.onPress, style: [styles.failuresCard, styles.failuresCardWarning], children: [_jsx(Text, { style: [styles.failuresLabel, styles.failuresWarningText], children: "Failures" }), _jsx(Text, { style: [styles.failuresTitle, styles.failuresWarningText], children: "Failures recorded" }), _jsxs(Text, { style: styles.failuresSubtitle, children: ["Latest: ", s.latestCreatedAt ?? "—", " \u2022 Tap to view all failures."] })] }));
}
export default function CommandCenterScreen(props) {
    const router = useRouter();
    const dayKey = useMemo(() => getTodayDayKey(), []);
    const dayTruth = useDayTruth(dayKey);
    const facts = useDailyFacts(dayKey);
    const insights = useInsights(dayKey);
    const ctx = useIntelligenceContext(dayKey);
    // Sprint 1: Failure presence must be visible and must not depend on readiness logic.
    // We query a tiny range with limit=1 and surface its truth immediately.
    const failuresPresence = useFailuresRange({ start: "1970-01-01", end: dayKey, limit: 1 }, { mode: "page" });
    const failuresPresenceUi = useMemo(() => {
        if (failuresPresence.status === "loading")
            return { status: "loading" };
        if (failuresPresence.status === "error") {
            return { status: "error", error: failuresPresence.error, requestId: failuresPresence.requestId };
        }
        const first = failuresPresence.data.items[0] ?? null;
        const latest = first?.createdAt ? formatIsoToLocal(first.createdAt) : null;
        return {
            status: "ready",
            hasFailures: failuresPresence.data.items.length > 0,
            latestCreatedAt: latest,
        };
    }, [failuresPresence]);
    const { replayOverride, replayLoading, replayError, replayMissing } = useReplayOverride(dayKey);
    const replay = props.replayOverride ?? replayOverride ?? null;
    const replayModeActive = Boolean(replay) ||
        Boolean(props.replayLoading ?? replayLoading) ||
        Boolean(props.replayMissing ?? replayMissing) ||
        Boolean(props.replayError ?? replayError);
    const pollTimer = useRef(null);
    const pollCount = useRef(0);
    const lastRefreshKey = useRef(null);
    const baselineCanonicalAt = useRef(null);
    const baselineFactsAt = useRef(null);
    const baselineCtxAt = useRef(null);
    const latestEventAtLive = dayTruth.status === "ready" ? dayTruth.data.latestCanonicalEventAt : null;
    const hasEventsLive = dayTruth.status === "ready" && dayTruth.data.eventsCount > 0;
    const latestEventAt = replayModeActive ? replay?.latestCanonicalEventAt ?? null : latestEventAtLive;
    const hasEvents = replayModeActive ? Boolean(replay?.latestCanonicalEventAt) : hasEventsLive;
    const eventsCount = dayTruth.status === "ready" ? dayTruth.data.eventsCount : null;
    const factsDoc = replayModeActive ? replay?.dailyFacts : facts.status === "ready" ? facts.data : null;
    const ctxDoc = replayModeActive ? replay?.intelligenceContext : ctx.status === "ready" ? ctx.data : null;
    const insightsDoc = replayModeActive ? replay?.insights : insights.status === "ready" ? insights.data : null;
    const factsComputedAt = factsDoc && typeof factsDoc?.meta?.computedAt === "string"
        ? factsDoc.meta.computedAt
        : null;
    const ctxComputedAt = ctxDoc && typeof ctxDoc?.meta?.computedAt === "string"
        ? ctxDoc.meta.computedAt
        : null;
    const factsPipelineVersion = factsDoc && typeof factsDoc?.meta?.pipelineVersion === "number"
        ? factsDoc.meta.pipelineVersion
        : null;
    const ctxPipelineVersion = ctxDoc && typeof ctxDoc?.meta?.pipelineVersion === "number"
        ? ctxDoc.meta.pipelineVersion
        : null;
    // Minimal, deterministic provenance for the “today metric surface”.
    // If facts/context disagree, we show facts as the primary computedAt/PV and
    // still show the dev overlay for deeper debugging.
    const computedAtForUi = factsComputedAt ?? ctxComputedAt ?? null;
    const pipelineVersionForUi = factsPipelineVersion ?? ctxPipelineVersion ?? null;
    const factsVersionOk = isCompatiblePipelineVersion({
        pipelineVersion: factsPipelineVersion,
        expectedPipelineVersion: PIPELINE_VERSION,
    });
    const ctxVersionOk = isCompatiblePipelineVersion({
        pipelineVersion: ctxPipelineVersion,
        expectedPipelineVersion: PIPELINE_VERSION,
    });
    const factsReadiness = replayModeActive
        ? undefined
        : resolveReadiness({
            network: facts.status === "loading" ? "loading" : facts.status === "error" ? "error" : "ok",
            zodValid: facts.status === "ready" || facts.status === "missing",
            eventsCount,
            computedAtIso: factsComputedAt,
            latestCanonicalEventAtIso: latestEventAt,
            pipelineVersion: factsPipelineVersion,
            expectedPipelineVersion: PIPELINE_VERSION,
        });
    const ctxReadiness = replayModeActive
        ? undefined
        : resolveReadiness({
            network: ctx.status === "loading" ? "loading" : ctx.status === "error" ? "error" : "ok",
            zodValid: ctx.status === "ready" || ctx.status === "missing",
            eventsCount,
            computedAtIso: ctxComputedAt,
            latestCanonicalEventAtIso: latestEventAt,
            pipelineVersion: ctxPipelineVersion,
            expectedPipelineVersion: PIPELINE_VERSION,
        });
    const factsFresh = replayModeActive ? Boolean(factsDoc) : factsReadiness?.state === "ready";
    const derivedReadyLive = factsReadiness?.state === "ready" && ctxReadiness?.state === "ready";
    const derivedReady = replayModeActive ? Boolean(factsDoc) && Boolean(ctxDoc) && factsVersionOk && ctxVersionOk : derivedReadyLive;
    const anyLoading = replayModeActive
        ? Boolean(props.replayLoading ?? replayLoading) || dayTruth.status === "loading"
        : dayTruth.status === "loading" || facts.status === "loading" || insights.status === "loading" || ctx.status === "loading";
    const anyError = replayModeActive
        ? Boolean(props.replayError ?? replayError) || dayTruth.status === "error"
        : dayTruth.status === "error" || facts.status === "error" || insights.status === "error" || ctx.status === "error";
    const dataReadinessState = replayModeActive
        ? anyLoading
            ? "loading"
            : anyError
                ? "invalid"
                : hasEvents
                    ? derivedReady
                        ? "ready"
                        : "partial"
                    : "empty"
        : factsReadiness && ctxReadiness
            ? factsReadiness.state === "invalid" || ctxReadiness.state === "invalid"
                ? "invalid"
                : factsReadiness.state === "partial" || ctxReadiness.state === "partial"
                    ? "partial"
                    : factsReadiness.state === "empty" || ctxReadiness.state === "empty"
                        ? "empty"
                        : factsReadiness.state === "loading" || ctxReadiness.state === "loading"
                            ? "loading"
                            : "ready"
            : "loading";
    const stopPolling = useCallback(() => {
        if (pollTimer.current)
            clearInterval(pollTimer.current);
        pollTimer.current = null;
    }, []);
    const kickRefetch = useCallback((cacheBust) => {
        const opts = cacheBust ? { cacheBust } : undefined;
        void dayTruth.refetch(opts);
        void facts.refetch(opts);
        void insights.refetch(opts);
        void ctx.refetch(opts);
        // Failure presence must also refresh when Command Center refreshes.
        void failuresPresence.refetch(opts);
    }, [dayTruth.refetch, facts.refetch, insights.refetch, ctx.refetch, failuresPresence.refetch]);
    useEffect(() => {
        kickRefetch();
    }, [props.focusNonce, kickRefetch]);
    useEffect(() => {
        const rk = props.refreshKey;
        if (!rk)
            return;
        if (lastRefreshKey.current === rk)
            return;
        lastRefreshKey.current = rk;
        baselineCanonicalAt.current = latestEventAt ?? null;
        baselineFactsAt.current = factsComputedAt ?? null;
        baselineCtxAt.current = ctxComputedAt ?? null;
        stopPolling();
        pollCount.current = 0;
        kickRefetch(rk);
        pollTimer.current = setInterval(() => {
            pollCount.current += 1;
            kickRefetch(rk);
            if (pollCount.current >= 6)
                stopPolling();
        }, 1500);
        return () => stopPolling();
    }, [props.refreshKey, latestEventAt, factsComputedAt, ctxComputedAt, stopPolling, kickRefetch]);
    useEffect(() => {
        if (!props.refreshKey)
            return;
        const canonicalAdvanced = baselineCanonicalAt.current && latestEventAt ? latestEventAt !== baselineCanonicalAt.current : false;
        const factsAdvanced = baselineFactsAt.current && factsComputedAt ? factsComputedAt !== baselineFactsAt.current : false;
        const ctxAdvanced = baselineCtxAt.current && ctxComputedAt ? ctxComputedAt !== baselineCtxAt.current : false;
        const pipelineCaughtUp = canonicalAdvanced && derivedReady && factsAdvanced && ctxAdvanced;
        if (pipelineCaughtUp)
            stopPolling();
    }, [props.refreshKey, latestEventAt, factsComputedAt, ctxComputedAt, derivedReady, stopPolling]);
    useFocusEffect(useCallback(() => {
        const unsubscribe = subscribeRefresh((ev) => {
            if (ev.topic !== "commandCenter")
                return;
            consumeRefresh(ev.topic, ev.key);
            kickRefetch(ev.key);
        });
        return () => unsubscribe();
    }, [kickRefetch]));
    let tone = "neutral";
    let title = "Status";
    let subtitle = "—";
    if (anyError) {
        tone = "danger";
        title = "Sync error";
        subtitle = "We couldn’t load today. Check your connection and try again.";
    }
    else if (anyLoading) {
        tone = "neutral";
        title = "Loading…";
        subtitle = "Fetching today’s data.";
    }
    else if (!hasEvents) {
        tone = "warning";
        title = "No data yet for today";
        subtitle = "Log your first event (weight, workout, sleep, steps) to start building your Health OS.";
    }
    else if (!derivedReady) {
        tone = "neutral";
        title = replayModeActive ? "Replay incomplete" : "Computing today…";
        subtitle = replayModeActive
            ? "This replay run does not include all required snapshots (facts/context) or pipeline versions mismatch."
            : "Waiting for derived truth to catch up to canonical events.";
    }
    else {
        tone = "success";
        title = replayModeActive ? "Replay is ready" : "Today is ready";
        subtitle = ["Events ✓", "Facts ✓", "Context ✓"].join("  •  ");
    }
    const eps = 0.01;
    const currentWeightKg = factsDoc && typeof factsDoc?.body?.weightKg === "number"
        ? factsDoc.body.weightKg
        : null;
    const optimistic = typeof props.optimisticWeightKg === "number" ? props.optimisticWeightKg : null;
    const factsMatchOptimistic = typeof currentWeightKg === "number" && optimistic !== null && Math.abs(currentWeightKg - optimistic) < eps;
    const inRefreshWindow = props.refreshKey !== null && optimistic !== null && !factsMatchOptimistic;
    const shouldPreferOptimisticWeight = !replayModeActive && optimistic !== null && (inRefreshWindow || !factsFresh || typeof currentWeightKg !== "number");
    const factsSummary = factsDoc
        ? {
            ...(typeof factsDoc?.activity?.steps === "number"
                ? { steps: factsDoc.activity.steps }
                : {}),
            ...(typeof factsDoc?.sleep?.totalMinutes === "number"
                ? { sleepMin: factsDoc.sleep.totalMinutes }
                : {}),
            ...(!shouldPreferOptimisticWeight &&
                typeof factsDoc?.body?.weightKg === "number"
                ? { weightKg: factsDoc.body.weightKg }
                : {}),
        }
        : null;
    const insightsCount = insightsDoc && typeof insightsDoc?.insights?.length === "number"
        ? insightsDoc.insights.length
        : null;
    const summaryArgs = {};
    if (factsSummary)
        summaryArgs.facts = factsSummary;
    if (typeof insightsCount === "number")
        summaryArgs.insightsCount = insightsCount;
    if (shouldPreferOptimisticWeight && optimistic !== null)
        summaryArgs.optimistic = { weightKg: optimistic };
    if (shouldPreferOptimisticWeight)
        summaryArgs.isSyncingOptimistic = true;
    const todaySummary = formatTodaySummary(summaryArgs);
    const replayUi = useReplayUi(dayKey);
    const onPickRun = useCallback((runId) => {
        router.setParams({ replay: "1", rid: runId });
    }, [router]);
    const onCloseReplay = useCallback(() => {
        router.setParams({ replay: undefined, rid: undefined });
    }, [router]);
    return (_jsx(SafeAreaView, { style: styles.safe, edges: ["top"], children: _jsxs(ScrollView, { contentContainerStyle: styles.container, keyboardShouldPersistTaps: "handled", children: [_jsx(CommandCenterHeader, { title: "Command Center", subtitle: todaySummary }), _jsx(FailurePresenceCard, { state: failuresPresenceUi, onPress: () => router.push("/(app)/failures") }), replayUi.enabled ? _jsx(ReplayPanel, { state: replayUi, onClose: onCloseReplay, onPickRun: onPickRun }) : null, _jsxs(View, { style: [styles.statusCard, { backgroundColor: toneBg[tone] }], children: [_jsx(Text, { style: [styles.statusLabel, { color: toneColor[tone] }], children: toneLabel[tone] }), _jsx(Text, { style: styles.statusTitle, children: title }), _jsx(Text, { style: styles.statusSubtitle, children: subtitle })] }), _jsx(ProvenanceRow, { label: replayModeActive ? "Replay" : "Today", computedAtIso: computedAtForUi, pipelineVersion: pipelineVersionForUi, latestCanonicalEventAtIso: latestEventAt, eventsCount: eventsCount }), _jsx(DevPipelineOverlay, { canonicalAt: latestEventAt, factsAt: factsComputedAt, contextAt: ctxComputedAt, factsPv: factsPipelineVersion, ctxPv: ctxPipelineVersion }), _jsx(QuickActionsRow, {}), _jsx(View, { style: styles.grid, children: COMMAND_CENTER_MODULES.map((m) => {
                        const disabled = isModuleDisabled(m.id, dataReadinessState);
                        const badge = getModuleBadge(m.id, dataReadinessState);
                        return (_jsx(ModuleTile, { id: m.id, title: m.title, ...(m.subtitle ? { subtitle: m.subtitle } : {}), ...(badge ? { badge } : {}), disabled: disabled, onPress: () => {
                                if (disabled)
                                    return;
                                router.push(m.href);
                            } }, m.id));
                    }) }), _jsxs(View, { style: styles.debugCard, children: [_jsx(Text, { style: styles.debugTitle, children: "Debug" }), _jsxs(Text, { style: styles.debugLine, children: ["Day: ", dayKey] }), _jsxs(Text, { style: styles.debugLine, children: ["Ready: ", String(derivedReady)] }), _jsxs(Text, { style: styles.debugLine, children: ["Data state: ", dataReadinessState] })] })] }) }));
}
const styles = StyleSheet.create({
    safe: { flex: 1, backgroundColor: "#FFFFFF" },
    container: { padding: 16, paddingBottom: 40 },
    failuresCard: {
        borderRadius: 16,
        padding: 14,
        marginTop: 12,
        marginBottom: 6,
    },
    failuresCardNeutral: { backgroundColor: "#F2F2F7" },
    failuresCardWarning: { backgroundColor: "#FFF5E6" },
    failuresCardDanger: { backgroundColor: "#FDECEC" },
    failuresLabel: { fontSize: 12, fontWeight: "900", color: "#111", letterSpacing: 0.2 },
    failuresTitle: { fontSize: 16, fontWeight: "900", marginTop: 6, color: "#111" },
    failuresSubtitle: { fontSize: 13, marginTop: 6, color: "#333", opacity: 0.85 },
    failuresWarningText: { color: "#7A4E00" },
    failuresDangerText: { color: "#B00020" },
    statusCard: {
        borderRadius: 16,
        padding: 14,
        marginTop: 12,
        marginBottom: 12,
    },
    statusLabel: { fontSize: 12, fontWeight: "700" },
    statusTitle: { fontSize: 18, fontWeight: "800", marginTop: 6, color: "#111" },
    statusSubtitle: { fontSize: 13, marginTop: 6, color: "#333" },
    grid: {
        flexDirection: "row",
        flexWrap: "wrap",
        gap: 12,
        marginTop: 10,
    },
    quickActionsRow: {
        flexDirection: "row",
        gap: 10,
        marginTop: 6,
        marginBottom: 6,
    },
    quickActionBtn: {
        flex: 1,
        borderRadius: 14,
        padding: 12,
        backgroundColor: "#F2F2F7",
    },
    quickActionTitle: { fontSize: 14, fontWeight: "800", color: "#111" },
    quickActionSubtitle: { fontSize: 12, color: "#555", marginTop: 2 },
    debugCard: {
        marginTop: 16,
        padding: 12,
        borderRadius: 14,
        backgroundColor: "#F8F8FA",
    },
    debugTitle: { fontSize: 13, fontWeight: "800", color: "#111", marginBottom: 6 },
    debugLine: { fontSize: 12, color: "#444" },
    devOverlay: {
        borderRadius: 14,
        padding: 10,
        backgroundColor: "#F7F7FF",
        borderWidth: 1,
        borderColor: "#E3E3FF",
        marginBottom: 10,
    },
    devOverlayTitle: { fontSize: 12, fontWeight: "800", marginBottom: 6, color: "#111" },
    devOverlayLine: { fontSize: 12, color: "#333" },
    replayPanel: {
        borderRadius: 14,
        padding: 12,
        backgroundColor: "#F7FAFF",
        borderWidth: 1,
        borderColor: "#DDE8FF",
        marginTop: 10,
        marginBottom: 6,
    },
    replayPanelHeaderRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
    replayPanelTitle: { fontSize: 13, fontWeight: "900", color: "#111" },
    replayCloseBtn: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 10, backgroundColor: "#E9F1FF" },
    replayCloseBtnText: { fontSize: 12, fontWeight: "800" },
    replayPanelMuted: { fontSize: 12, color: "#445", marginTop: 6 },
    replayPanelError: { fontSize: 12, color: "#B00020", marginTop: 6 },
    replayRunsList: { marginTop: 10, gap: 8 },
    replayRunRow: { padding: 10, borderRadius: 12, backgroundColor: "#FFFFFF", borderWidth: 1, borderColor: "#E6EEFF" },
    replayRunRowSelected: { borderColor: "#8FB1FF" },
    replayRunId: { fontSize: 12, fontWeight: "900", color: "#111" },
    replayRunMeta: { fontSize: 12, color: "#445", marginTop: 3 },
    replayDivider: { height: 1, backgroundColor: "#DDE8FF", marginVertical: 10 },
});
