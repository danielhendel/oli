// services/functions/src/dailyFacts/aggregateDailyFacts.ts
const isNumber = (value) => typeof value === 'number' && Number.isFinite(value);
const average = (values) => {
    if (values.length === 0)
        return undefined;
    const sum = values.reduce((acc, v) => acc + v, 0);
    return sum / values.length;
};
// -----------------------------------------------------------------------------
// Kind filters (keeps downstream code fully typed)
// -----------------------------------------------------------------------------
const isSleepEvent = (e) => e.kind === 'sleep';
const isStepsEvent = (e) => e.kind === 'steps';
const isWorkoutEvent = (e) => e.kind === 'workout';
const isWeightEvent = (e) => e.kind === 'weight';
const isHrvEvent = (e) => e.kind === 'hrv';
// -----------------------------------------------------------------------------
// Builders
// -----------------------------------------------------------------------------
const buildSleepFacts = (events) => {
    const sleepEvents = events.filter(isSleepEvent);
    if (sleepEvents.length === 0)
        return undefined;
    const facts = {};
    const totalMinutes = sleepEvents.reduce((sum, e) => sum + e.totalMinutes, 0);
    if (totalMinutes > 0) {
        facts.totalMinutes = totalMinutes;
    }
    const mainSleepMinutes = sleepEvents.reduce((sum, e) => (e.isMainSleep ? sum + e.totalMinutes : sum), 0);
    if (mainSleepMinutes > 0) {
        facts.mainSleepMinutes = mainSleepMinutes;
    }
    const efficiencies = sleepEvents.map((e) => e.efficiency).filter(isNumber);
    const avgEff = average(efficiencies);
    if (avgEff !== undefined) {
        facts.efficiency = avgEff;
    }
    const latencies = sleepEvents.map((e) => e.latencyMinutes).filter(isNumber);
    const avgLatency = average(latencies);
    if (avgLatency !== undefined) {
        facts.latencyMinutes = avgLatency;
    }
    const awakenings = sleepEvents
        .map((e) => e.awakenings)
        .filter(isNumber)
        .reduce((sum, v) => sum + v, 0);
    if (awakenings > 0) {
        facts.awakenings = awakenings;
    }
    return Object.keys(facts).length > 0 ? facts : undefined;
};
const buildActivityFacts = (events) => {
    const stepsEvents = events.filter(isStepsEvent);
    const workoutEvents = events.filter(isWorkoutEvent);
    if (stepsEvents.length === 0 && workoutEvents.length === 0)
        return undefined;
    const facts = {};
    const steps = stepsEvents.reduce((sum, e) => sum + e.steps, 0);
    if (steps > 0) {
        facts.steps = steps;
    }
    const distanceKm = stepsEvents
        .map((e) => e.distanceKm)
        .filter(isNumber)
        .reduce((sum, v) => sum + v, 0);
    if (distanceKm > 0) {
        facts.distanceKm = distanceKm;
    }
    const moveMinutes = stepsEvents
        .map((e) => e.moveMinutes)
        .filter(isNumber)
        .reduce((sum, v) => sum + v, 0);
    if (moveMinutes > 0) {
        facts.moveMinutes = moveMinutes;
    }
    const trainingLoad = workoutEvents
        .map((e) => e.trainingLoad)
        .filter(isNumber)
        .reduce((sum, v) => sum + v, 0);
    if (trainingLoad > 0) {
        facts.trainingLoad = trainingLoad;
    }
    return Object.keys(facts).length > 0 ? facts : undefined;
};
const buildBodyFacts = (events) => {
    const weightEvents = events.filter(isWeightEvent);
    if (weightEvents.length === 0)
        return undefined;
    // latest measurement wins (lexicographic ISO timestamp sort is safe here)
    const latest = [...weightEvents].sort((a, b) => (a.start < b.start ? -1 : a.start > b.start ? 1 : 0))[weightEvents.length - 1];
    if (!latest)
        return undefined;
    const facts = {
        weightKg: latest.weightKg,
    };
    if (isNumber(latest.bodyFatPercent)) {
        facts.bodyFatPercent = latest.bodyFatPercent;
    }
    return facts;
};
const buildRecoveryFacts = (events) => {
    const hrvEvents = events.filter(isHrvEvent);
    if (hrvEvents.length === 0)
        return undefined;
    const facts = {};
    const rmssd = hrvEvents.map((e) => e.rmssdMs).filter(isNumber);
    const avgRmssd = average(rmssd);
    if (avgRmssd !== undefined) {
        facts.hrvRmssd = avgRmssd;
    }
    // sdnnMs not promoted to DailyFacts in v1 (reserved)
    // restingHeartRate/readinessScore reserved for future sources/rules.
    return Object.keys(facts).length > 0 ? facts : undefined;
};
/**
 * Aggregate CanonicalEvents for a single user + day into a DailyFacts document.
 *
 * - Pure and deterministic given the input.
 * - Uses only CanonicalEvents, never RawEvents.
 * - Safe for scheduled jobs and reprocessing pipelines.
 */
export const aggregateDailyFactsForDay = (input) => {
    const { userId, date, computedAt, events } = input;
    const sleep = buildSleepFacts(events);
    const activity = buildActivityFacts(events);
    const body = buildBodyFacts(events);
    const recovery = buildRecoveryFacts(events);
    const dailyFacts = {
        userId,
        date,
        schemaVersion: 1,
        computedAt,
    };
    if (sleep)
        dailyFacts.sleep = sleep;
    if (activity)
        dailyFacts.activity = activity;
    if (recovery)
        dailyFacts.recovery = recovery;
    if (body)
        dailyFacts.body = body;
    return dailyFacts;
};
