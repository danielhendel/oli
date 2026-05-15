"use strict";
/**
 * Build Firestore merge payload for `users/{uid}/sleepNights/{anchorDay}` from an Oura sleep API doc.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.coerceOuraSleepScore0to100 = coerceOuraSleepScore0to100;
exports.buildSleepNightFromOuraSleepDocument = buildSleepNightFromOuraSleepDocument;
const contracts_1 = require("@oli/contracts");
const resolveOuraSleepIngestBase_1 = require("./resolveOuraSleepIngestBase");
function stripUndefined(obj) {
    const out = {};
    for (const [k, v] of Object.entries(obj)) {
        if (v === undefined)
            continue;
        if (v !== null && typeof v === "object" && !Array.isArray(v) && Object.getPrototypeOf(v) === Object.prototype) {
            out[k] = stripUndefined(v);
        }
        else {
            out[k] = v;
        }
    }
    return out;
}
function toYmd(iso) {
    return iso.slice(0, 10);
}
/**
 * Coerce Oura sleep score / composite_score (number or digit string) to 0–100 integer.
 */
function coerceOuraSleepScore0to100(raw) {
    if (typeof raw === "number" && Number.isFinite(raw)) {
        return Math.round(Math.max(0, Math.min(100, raw)));
    }
    if (typeof raw === "string") {
        const t = raw.trim();
        if (t === "")
            return null;
        const n = Number(t);
        if (!Number.isFinite(n))
            return null;
        return Math.round(Math.max(0, Math.min(100, n)));
    }
    return null;
}
/**
 * Build Firestore merge payload for `users/{uid}/sleepNights/{anchorDay}`.
 * Returns null when bed/wake cannot be resolved (same gate as ingest).
 */
function buildSleepNightFromOuraSleepDocument(doc, ctx) {
    const resolved = (0, resolveOuraSleepIngestBase_1.resolveOuraSleepIngestBase)(doc);
    if (!resolved)
        return null;
    const { start, end, rollupDay: anchorDay } = resolved;
    const wakeDay = (0, contracts_1.localCalendarDayKeyFromIsoInTimeZone)(end, "UTC") ?? toYmd(end);
    const totalSec = typeof doc.total_sleep_duration === "number" ? doc.total_sleep_duration : null;
    const totalSleepMinutes = totalSec != null && totalSec >= 0 ? Math.round(totalSec / 60) : undefined;
    const remSec = typeof doc.rem_sleep_duration === "number"
        ? doc.rem_sleep_duration
        : null;
    const remMinutes = remSec != null && remSec >= 0 ? Math.round(remSec / 60) : undefined;
    const deepSec = typeof doc.deep_sleep_duration === "number"
        ? doc.deep_sleep_duration
        : null;
    const deepMinutes = deepSec != null && deepSec >= 0 ? Math.round(deepSec / 60) : undefined;
    const efficiencyRaw = doc.efficiency;
    const efficiency = typeof efficiencyRaw === "number" && Number.isFinite(efficiencyRaw) && efficiencyRaw >= 0 && efficiencyRaw <= 100
        ? efficiencyRaw
        : undefined;
    const latencyRaw = doc.latency;
    const latencyMinutes = typeof latencyRaw === "number" && Number.isFinite(latencyRaw) && latencyRaw >= 0
        ? (0, resolveOuraSleepIngestBase_1.normalizeOuraLatencyRawToMinutes)(latencyRaw)
        : undefined;
    const score = coerceOuraSleepScore0to100(doc.score ?? doc.composite_score);
    let remPercent;
    let deepPercent;
    if (typeof totalSleepMinutes === "number" && totalSleepMinutes > 0) {
        if (typeof remMinutes === "number" && remMinutes >= 0) {
            remPercent = Math.round((remMinutes / totalSleepMinutes) * 100);
        }
        if (typeof deepMinutes === "number" && deepMinutes >= 0) {
            deepPercent = Math.round((deepMinutes / totalSleepMinutes) * 100);
        }
    }
    const mainSleepMinutes = typeof totalSleepMinutes === "number" ? totalSleepMinutes : undefined;
    const hasDuration = (typeof totalSleepMinutes === "number" && totalSleepMinutes > 0) ||
        (typeof mainSleepMinutes === "number" && mainSleepMinutes > 0);
    const hasWakeOrEnd = typeof wakeDay === "string" && wakeDay.length > 0 && typeof end === "string";
    const isComplete = Boolean(anchorDay && hasWakeOrEnd && hasDuration);
    const base = {
        anchorDay,
        wakeDay,
        provider: "oura",
        source: "ouraVendorSleep",
        sourceDocumentId: ctx.sourceDocumentId,
        isComplete,
        startedAt: start,
        endedAt: end,
    };
    if (typeof totalSleepMinutes === "number")
        base.totalSleepMinutes = totalSleepMinutes;
    if (typeof mainSleepMinutes === "number")
        base.mainSleepMinutes = mainSleepMinutes;
    if (efficiency !== undefined)
        base.efficiency = efficiency;
    if (typeof remMinutes === "number")
        base.remMinutes = remMinutes;
    if (typeof remPercent === "number")
        base.remPercent = remPercent;
    if (typeof deepMinutes === "number")
        base.deepMinutes = deepMinutes;
    if (typeof deepPercent === "number")
        base.deepPercent = deepPercent;
    if (typeof latencyMinutes === "number")
        base.latencyMinutes = latencyMinutes;
    if (score != null)
        base.score = score;
    return { anchorDay, merge: stripUndefined(base) };
}
