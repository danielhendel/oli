import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
// app/(app)/training/strength/log.tsx
import { useEffect, useMemo, useState } from "react";
import { View, Text, TextInput, Pressable, StyleSheet } from "react-native";
import { useRouter, useLocalSearchParams } from "expo-router";
import { ModuleScreenShell } from "@/lib/ui/ModuleScreenShell";
import { useAuth } from "@/lib/auth/AuthProvider";
import { logStrengthWorkout } from "@/lib/api/usersMe";
import { buildManualStrengthWorkoutPayload, } from "@/lib/events/manualStrengthWorkout";
import { emitRefresh } from "@/lib/navigation/refreshBus";
import { ymdInTimeZoneFromIso } from "@/lib/time/dayKey";
const getDeviceTimeZone = () => {
    try {
        const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
        return typeof tz === "string" && tz.length ? tz : "UTC";
    }
    catch {
        return "UTC";
    }
};
function makeRefreshKey() {
    return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}
const newSet = () => ({
    id: `set-${Date.now()}-${Math.random().toString(36).slice(2)}`,
    repsText: "",
    loadText: "",
    unit: "lb",
});
const newExercise = () => ({
    id: `ex-${Date.now()}-${Math.random().toString(36).slice(2)}`,
    name: "",
    sets: [newSet()],
});
function parseReps(s) {
    const n = parseInt(s.trim(), 10);
    return Number.isFinite(n) && n >= 0 && Number.isInteger(n) ? n : null;
}
function parseLoad(s) {
    const n = parseFloat(s.trim());
    return Number.isFinite(n) && n >= 0 ? n : null;
}
function parseRpeRir(s) {
    const n = parseFloat(s.trim());
    return Number.isFinite(n) && n >= 0 && n <= 10 ? n : null;
}
export default function StrengthLogScreen() {
    const router = useRouter();
    const params = useLocalSearchParams();
    const forcedDay = typeof params.day === "string" && /^\d{4}-\d{2}-\d{2}$/.test(params.day) ? params.day : null;
    const { user, initializing, getIdToken } = useAuth();
    const [startedAt, setStartedAt] = useState(() => new Date().toISOString());
    const [timeZone] = useState(() => getDeviceTimeZone());
    const [exercises, setExercises] = useState(() => [newExercise()]);
    const [status, setStatus] = useState({ state: "idle" });
    // Reset startedAt to now when screen mounts (or user could have a "set to now" button)
    useEffect(() => {
        setStartedAt(new Date().toISOString());
    }, []);
    const { payload, valid, errors } = useMemo(() => {
        const errs = [];
        const built = [];
        for (let ei = 0; ei < exercises.length; ei++) {
            const ex = exercises[ei];
            if (!ex)
                continue;
            const name = ex.name.trim();
            if (!name) {
                if (ex.sets.some((set) => set.repsText.trim() || set.loadText.trim())) {
                    errs.push(`Exercise ${ei + 1}: name required`);
                }
                continue;
            }
            const sets = [];
            for (let si = 0; si < ex.sets.length; si++) {
                const s = ex.sets[si];
                if (!s)
                    continue;
                const reps = parseReps(s.repsText);
                const load = parseLoad(s.loadText);
                if (s.repsText.trim() === "" && s.loadText.trim() === "")
                    continue;
                if (reps === null) {
                    errs.push(`${name} set ${si + 1}: reps must be a non-negative integer`);
                }
                if (load === null) {
                    errs.push(`${name} set ${si + 1}: load must be a non-negative number`);
                }
                if (reps === null || load === null)
                    continue;
                const rpe = s.rpeText?.trim() ? parseRpeRir(s.rpeText) : undefined;
                const rir = s.rirText?.trim() ? parseRpeRir(s.rirText) : undefined;
                if (s.rpeText?.trim() && s.rirText?.trim()) {
                    errs.push(`${name} set ${si + 1}: use RPE or RIR, not both`);
                }
                else if (s.rpeText?.trim() && (rpe === null || rpe === undefined)) {
                    errs.push(`${name} set ${si + 1}: RPE must be 0–10`);
                }
                else if (s.rirText?.trim() && (rir === null || rir === undefined)) {
                    errs.push(`${name} set ${si + 1}: RIR must be 0–10`);
                }
                sets.push({
                    reps,
                    load,
                    unit: s.unit,
                    ...(s.isWarmup ? { isWarmup: true } : {}),
                    ...(rpe !== undefined && rpe !== null ? { rpe } : {}),
                    ...(rir !== undefined && rir !== null ? { rir } : {}),
                    ...(s.notes?.trim() ? { notes: s.notes.trim().slice(0, 256) } : {}),
                });
            }
            if (sets.length === 0 && ex.sets.some((set) => set.repsText.trim() || set.loadText.trim())) {
                errs.push(`${name}: at least one valid set (reps + load) required`);
            }
            else if (sets.length > 0) {
                built.push({ name, sets });
            }
        }
        if (built.length === 0 && exercises.some((e) => e.name.trim() || e.sets.some((s) => s.repsText || s.loadText))) {
            if (errs.length === 0)
                errs.push("At least one exercise with valid sets required");
        }
        const valid = errs.length === 0 && built.length > 0;
        const payload = valid
            ? { startedAt, timeZone, exercises: built }
            : null;
        return { payload, valid, errors: errs };
    }, [exercises, startedAt, timeZone]);
    const canSave = !initializing &&
        Boolean(user) &&
        valid &&
        payload !== null &&
        status.state !== "saving";
    const onSave = async () => {
        if (!canSave || !payload)
            return;
        setStatus({ state: "saving" });
        try {
            if (initializing) {
                setStatus({ state: "error", message: "Auth still initializing. Try again." });
                return;
            }
            if (!user) {
                setStatus({ state: "error", message: "Not signed in." });
                return;
            }
            const token = await getIdToken(false);
            if (!token) {
                setStatus({ state: "error", message: "No auth token (try Debug → Re-auth)" });
                return;
            }
            const built = buildManualStrengthWorkoutPayload(payload);
            const res = await logStrengthWorkout(built, token);
            if (!res.ok) {
                setStatus({
                    state: "error",
                    message: `${res.error} (kind=${res.kind}, status=${res.status}, requestId=${res.requestId ?? "n/a"})`,
                });
                return;
            }
            setStatus({ state: "saved", rawEventId: res.json.rawEventId });
            const refreshKey = makeRefreshKey();
            emitRefresh("commandCenter", refreshKey);
            const day = forcedDay ?? ymdInTimeZoneFromIso(payload.startedAt, payload.timeZone);
            router.replace({
                pathname: "/(app)/command-center",
                params: { day, refresh: refreshKey },
            });
        }
        catch (e) {
            const msg = e instanceof Error ? e.message : "Unknown error";
            setStatus({ state: "error", message: msg });
        }
    };
    const addExercise = () => setExercises((prev) => [...prev, newExercise()]);
    const removeExercise = (id) => setExercises((prev) => (prev.length > 1 ? prev.filter((e) => e.id !== id) : prev));
    const updateExercise = (id, patch) => setExercises((prev) => prev.map((e) => (e.id === id ? { ...e, ...patch } : e)));
    const addSet = (exId) => setExercises((prev) => prev.map((e) => (e.id === exId ? { ...e, sets: [...e.sets, newSet()] } : e)));
    const removeSet = (exId, setId) => setExercises((prev) => prev.map((e) => e.id === exId && e.sets.length > 1
        ? { ...e, sets: e.sets.filter((s) => s.id !== setId) }
        : e));
    const updateSet = (exId, setId, patch) => setExercises((prev) => prev.map((e) => e.id === exId
        ? { ...e, sets: e.sets.map((s) => (s.id === setId ? { ...s, ...patch } : s)) }
        : e));
    return (_jsx(ModuleScreenShell, { title: "Log Strength", subtitle: "Manual strength workout", children: _jsxs(View, { style: styles.card, children: [_jsx(Text, { style: styles.label, children: "Started at" }), _jsx(TextInput, { value: startedAt, onChangeText: setStartedAt, placeholder: "ISO datetime", style: styles.input, accessibilityLabel: "Workout start time" }), exercises.map((ex, exIdx) => (_jsxs(View, { style: styles.exerciseCard, children: [_jsxs(View, { style: styles.exerciseHeader, children: [_jsx(TextInput, { value: ex.name, onChangeText: (t) => updateExercise(ex.id, { name: t }), placeholder: `Exercise ${exIdx + 1} name`, style: [styles.input, styles.exerciseName], accessibilityLabel: `Exercise ${exIdx + 1} name` }), _jsx(Pressable, { onPress: () => removeExercise(ex.id), style: styles.removeBtn, accessibilityRole: "button", accessibilityLabel: `Remove exercise ${exIdx + 1}`, children: _jsx(Text, { style: styles.removeBtnText, children: "Remove" }) })] }), ex.sets.map((s, si) => (_jsxs(View, { style: styles.setRow, children: [_jsx(TextInput, { value: s.repsText, onChangeText: (t) => updateSet(ex.id, s.id, { repsText: t }), placeholder: "Reps", keyboardType: "number-pad", style: [styles.input, styles.setInput], accessibilityLabel: `Set ${si + 1} reps` }), _jsx(TextInput, { value: s.loadText, onChangeText: (t) => updateSet(ex.id, s.id, { loadText: t }), placeholder: "Load", keyboardType: "decimal-pad", style: [styles.input, styles.setInput], accessibilityLabel: `Set ${si + 1} load` }), _jsxs(View, { style: styles.unitGroup, children: [_jsx(Pressable, { onPress: () => updateSet(ex.id, s.id, { unit: "lb" }), style: [styles.unitButton, s.unit === "lb" && styles.unitActive], children: _jsx(Text, { style: [styles.unitText, s.unit === "lb" && styles.unitTextActive], children: "lb" }) }), _jsx(Pressable, { onPress: () => updateSet(ex.id, s.id, { unit: "kg" }), style: [styles.unitButton, s.unit === "kg" && styles.unitActive], children: _jsx(Text, { style: [styles.unitText, s.unit === "kg" && styles.unitTextActive], children: "kg" }) })] }), _jsx(Pressable, { onPress: () => updateSet(ex.id, s.id, { isWarmup: !s.isWarmup }), style: [styles.warmupBtn, s.isWarmup && styles.warmupActive], accessibilityLabel: `Set ${si + 1} warmup ${s.isWarmup ? "on" : "off"}`, children: _jsx(Text, { style: [styles.warmupText, s.isWarmup && styles.warmupTextActive], children: "W" }) }), _jsx(TextInput, { value: s.rpeText ?? "", onChangeText: (t) => updateSet(ex.id, s.id, { rpeText: t, rirText: t ? "" : (s.rirText ?? "") }), placeholder: "RPE", keyboardType: "decimal-pad", style: [styles.input, styles.optInput], accessibilityLabel: `Set ${si + 1} RPE` }), _jsx(TextInput, { value: s.rirText ?? "", onChangeText: (t) => updateSet(ex.id, s.id, { rirText: t, rpeText: t ? "" : (s.rpeText ?? "") }), placeholder: "RIR", keyboardType: "decimal-pad", style: [styles.input, styles.optInput], accessibilityLabel: `Set ${si + 1} RIR` }), _jsx(Pressable, { onPress: () => removeSet(ex.id, s.id), style: styles.removeSetBtn, accessibilityRole: "button", children: _jsx(Text, { style: styles.removeBtnText, children: "\u2212" }) })] }, s.id))), _jsx(Pressable, { onPress: () => addSet(ex.id), style: styles.addSetBtn, children: _jsx(Text, { style: styles.addSetText, children: "+ Add set" }) })] }, ex.id))), _jsx(Pressable, { onPress: addExercise, style: styles.addExBtn, children: _jsx(Text, { style: styles.addExText, children: "+ Add exercise" }) }), errors.length > 0 ? (_jsx(View, { style: styles.errorBlock, children: errors.map((err, i) => (_jsx(Text, { style: styles.helperError, children: err }, i))) })) : null, _jsx(Pressable, { onPress: () => void onSave(), disabled: !canSave, accessibilityRole: "button", accessibilityLabel: "Save workout", style: ({ pressed }) => [
                        styles.saveButton,
                        !canSave && styles.saveDisabled,
                        pressed && canSave && { opacity: 0.9 },
                    ], children: _jsx(Text, { style: styles.saveText, children: status.state === "saving" ? "Saving…" : "Save" }) }), status.state === "error" ? _jsx(Text, { style: styles.helperError, children: status.message }) : null, status.state === "saved" ? (_jsxs(Text, { style: styles.helperSuccess, children: ["Saved (rawEventId: ", status.rawEventId, ")"] })) : null, _jsx(Text, { style: styles.helperNote, children: "Daily facts may take a moment to update while the pipeline processes your raw event." })] }) }));
}
const styles = StyleSheet.create({
    card: { backgroundColor: "#F2F2F7", borderRadius: 16, padding: 14, gap: 8 },
    label: { fontSize: 13, fontWeight: "700", color: "#111827" },
    input: {
        backgroundColor: "#FFFFFF",
        borderRadius: 12,
        paddingHorizontal: 12,
        paddingVertical: 12,
        fontSize: 16,
        borderWidth: 1,
        borderColor: "#E5E7EB",
    },
    exerciseCard: { backgroundColor: "#FFFFFF", borderRadius: 12, padding: 12, borderWidth: 1, borderColor: "#E5E7EB", gap: 8 },
    exerciseHeader: { flexDirection: "row", alignItems: "center", gap: 8 },
    exerciseName: { flex: 1 },
    setRow: { flexDirection: "row", alignItems: "center", gap: 6, flexWrap: "wrap" },
    setInput: { width: 56, paddingHorizontal: 8 },
    optInput: { width: 48, paddingHorizontal: 8 },
    unitGroup: {
        flexDirection: "row",
        backgroundColor: "#F2F2F7",
        borderRadius: 8,
        overflow: "hidden",
    },
    unitButton: { paddingHorizontal: 10, paddingVertical: 10 },
    unitActive: { backgroundColor: "#111827" },
    unitText: { fontSize: 12, fontWeight: "700", color: "#111827" },
    unitTextActive: { color: "#FFFFFF" },
    warmupBtn: { paddingHorizontal: 8, paddingVertical: 8, backgroundColor: "#F2F2F7", borderRadius: 8 },
    warmupActive: { backgroundColor: "#111827" },
    warmupText: { fontSize: 12, fontWeight: "700", color: "#111827" },
    warmupTextActive: { color: "#FFFFFF" },
    addSetBtn: { alignSelf: "flex-start", paddingVertical: 6 },
    addSetText: { fontSize: 13, fontWeight: "600", color: "#6B7280" },
    addExBtn: { paddingVertical: 10, alignItems: "center", borderWidth: 1, borderColor: "#E5E7EB", borderRadius: 12, borderStyle: "dashed" },
    addExText: { fontSize: 14, fontWeight: "700", color: "#6B7280" },
    removeBtn: { paddingVertical: 8, paddingHorizontal: 12 },
    removeBtnText: { fontSize: 12, fontWeight: "600", color: "#B00020" },
    removeSetBtn: { padding: 8 },
    saveButton: {
        marginTop: 10,
        backgroundColor: "#111827",
        borderRadius: 14,
        paddingVertical: 14,
        alignItems: "center",
    },
    saveDisabled: { opacity: 0.35 },
    saveText: { color: "#FFFFFF", fontSize: 15, fontWeight: "800" },
    helperError: { color: "#B00020", fontSize: 12, fontWeight: "600" },
    helperSuccess: { color: "#1B5E20", fontSize: 12, fontWeight: "700" },
    helperNote: { marginTop: 8, color: "#6B7280", fontSize: 12, fontWeight: "600" },
    errorBlock: { gap: 4 },
});
