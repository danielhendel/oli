import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
// app/(app)/(tabs)/library/index.tsx
import { ScrollView, View, Text, StyleSheet, Pressable } from "react-native";
import { useRouter } from "expo-router";
import { ScreenContainer } from "@/lib/ui/ScreenStates";
import { useFailuresRange } from "@/lib/data/useFailuresRange";
import { useUploadsPresence } from "@/lib/data/useUploadsPresence";
import { useMemo } from "react";
/** Sprint 4 — Quick passive lenses (links to Search with filters). */
const QUICK_LENSES = [
    { id: "unresolved", label: "Unresolved", path: "/(app)/(tabs)/library/search", params: { unresolvedLens: "1" } },
    { id: "uncertain", label: "Uncertain", path: "/(app)/(tabs)/library/search", params: { uncertaintyFilter: "uncertain" } },
    { id: "corrections", label: "Corrections", path: "/(app)/(tabs)/library/search", params: { provenanceFilter: "correction" } },
];
const LIBRARY_CATEGORIES = [
    { id: "search", title: "Search", countLabel: "Filters" },
    { id: "strength", title: "Strength", kinds: ["strength_workout"] },
    { id: "cardio", title: "Cardio", kinds: ["steps", "workout"] },
    { id: "sleep", title: "Sleep", kinds: ["sleep"] },
    { id: "hrv", title: "HRV", kinds: ["hrv"] },
    { id: "labs", title: "Labs", countLabel: "Available" },
    { id: "uploads", title: "Uploads", countLabel: "Available" },
    { id: "failures", title: "Failures", countLabel: "Available" },
];
function getRangeForCount() {
    const end = new Date();
    const start = new Date();
    start.setDate(start.getDate() - 90);
    return {
        start: start.toISOString().slice(0, 10),
        end: end.toISOString().slice(0, 10),
    };
}
export default function LibraryIndexScreen() {
    const router = useRouter();
    const range = useMemo(() => getRangeForCount(), []);
    const failures = useFailuresRange({ start: range.start, end: range.end, limit: 500 }, { mode: "page" });
    const uploads = useUploadsPresence();
    const getCategoryCount = (cat) => {
        if (cat.id === "search")
            return "Filters";
        if (cat.id === "failures") {
            if (failures.status === "partial")
                return "…";
            if (failures.status === "ready")
                return String(failures.data.items.length);
            return "—";
        }
        if (cat.id === "uploads") {
            if (uploads.status === "partial")
                return "…";
            if (uploads.status === "ready")
                return String(uploads.data.count);
            return "—";
        }
        return cat.countLabel ?? "Available";
    };
    return (_jsx(ScreenContainer, { children: _jsxs(ScrollView, { contentContainerStyle: styles.scroll, children: [_jsx(Text, { style: styles.title, children: "Library" }), _jsx(Text, { style: styles.subtitle, children: "Category list with presence and counts" }), _jsx(View, { style: styles.quickLenses, children: QUICK_LENSES.map((l) => (_jsx(Pressable, { style: styles.lensBtn, onPress: () => router.push({
                            pathname: l.path,
                            params: l.params,
                        }), children: _jsx(Text, { style: styles.lensBtnText, children: l.label }) }, l.id))) }), _jsx(View, { style: styles.list, children: LIBRARY_CATEGORIES.map((cat) => (_jsxs(Pressable, { style: styles.row, onPress: () => router.push(cat.id === "search"
                            ? "/(app)/(tabs)/library/search"
                            : {
                                pathname: "/(app)/(tabs)/library/[category]",
                                params: { category: cat.id },
                            }), accessibilityLabel: `${cat.title}, ${getCategoryCount(cat)}`, children: [_jsx(Text, { style: styles.rowTitle, children: cat.title }), _jsx(Text, { style: styles.rowCount, children: getCategoryCount(cat) })] }, cat.id))) })] }) }));
}
const styles = StyleSheet.create({
    scroll: { padding: 16, paddingBottom: 40 },
    title: { fontSize: 28, fontWeight: "900", color: "#1C1C1E" },
    subtitle: { fontSize: 15, color: "#8E8E93", marginTop: 4 },
    quickLenses: { flexDirection: "row", gap: 8, marginTop: 16, flexWrap: "wrap" },
    lensBtn: {
        paddingVertical: 8,
        paddingHorizontal: 14,
        borderRadius: 8,
        backgroundColor: "#F2F2F7",
    },
    lensBtnText: { fontSize: 14, fontWeight: "600", color: "#007AFF" },
    list: { marginTop: 24, gap: 1, backgroundColor: "#F2F2F7", borderRadius: 12, overflow: "hidden" },
    row: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        padding: 16,
        backgroundColor: "#FFFFFF",
    },
    rowTitle: { fontSize: 17, fontWeight: "600", color: "#1C1C1E" },
    rowCount: { fontSize: 15, color: "#8E8E93" },
});
