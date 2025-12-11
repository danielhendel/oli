// services/functions/src/normalization/mapRawEventToCanonical.ts

import type {
    CanonicalEvent,
    RawEvent,
    IsoDateTimeString,
    YmdDateString,
    SleepCanonicalEvent,
    StepsCanonicalEvent,
    WorkoutCanonicalEvent,
    WeightCanonicalEvent,
    HrvCanonicalEvent,
  } from '../types/health';
  
  /**
   * RawEvent → CanonicalEvent mapper.
   *
   * Properties:
   * - Pure: no Firestore/Admin calls, no I/O.
   * - Deterministic: same RawEvent → same CanonicalEvent.
   * - Safe to reuse in the Reprocessing Engine.
   */
  
  export type MappingFailureReason =
    | 'UNSUPPORTED_PROVIDER'
    | 'UNSUPPORTED_KIND'
    | 'MALFORMED_PAYLOAD';
  
  export type MappingFailure = {
    ok: false;
    reason: MappingFailureReason;
    details?: Record<string, unknown>;
  };
  
  export type MappingSuccess = {
    ok: true;
    canonical: CanonicalEvent;
  };
  
  export type MappingResult = MappingSuccess | MappingFailure;
  
  // -----------------------------------------------------------------------------
  // Manual payload shapes & guards
  // -----------------------------------------------------------------------------
  
  type ManualWindowBase = {
    start: IsoDateTimeString;
    end: IsoDateTimeString;
    day: YmdDateString;
    timezone: string;
  };
  
  type ManualSleepPayload = ManualWindowBase & {
    totalMinutes: number;
    efficiency?: number | null;
    latencyMinutes?: number | null;
    awakenings?: number | null;
    isMainSleep: boolean;
  };
  
  type ManualStepsPayload = ManualWindowBase & {
    steps: number;
    distanceKm?: number | null;
    moveMinutes?: number | null;
  };
  
  type ManualWorkoutPayload = ManualWindowBase & {
    sport: string;
    intensity?: 'easy' | 'moderate' | 'hard';
    durationMinutes: number;
    trainingLoad?: number | null;
  };
  
  type ManualWeightPayload = {
    time: IsoDateTimeString;
    day: YmdDateString;
    timezone: string;
    weightKg: number;
    bodyFatPercent?: number | null;
  };
  
  type ManualHrvPayload = {
    time: IsoDateTimeString;
    day: YmdDateString;
    timezone: string;
    rmssdMs?: number | null;
    sdnnMs?: number | null;
    measurementType?: 'nightly' | 'spot';
  };
  
  type ManualPayloadByKind = {
    sleep: ManualSleepPayload;
    steps: ManualStepsPayload;
    workout: ManualWorkoutPayload;
    weight: ManualWeightPayload;
    hrv: ManualHrvPayload;
  };
  
  const isRecord = (value: unknown): value is Record<string, unknown> =>
    typeof value === 'object' && value !== null;
  
  const hasString = (
    obj: Record<string, unknown>,
    key: string,
  ): obj is Record<string, string> => typeof obj[key] === 'string';
  
  const hasNumber = (
    obj: Record<string, unknown>,
    key: string,
  ): obj is Record<string, number> => typeof obj[key] === 'number';
  
  const isManualWindowBase = (value: unknown): value is ManualWindowBase => {
    if (!isRecord(value)) return false;
    return (
      hasString(value, 'start') &&
      hasString(value, 'end') &&
      hasString(value, 'day') &&
      hasString(value, 'timezone')
    );
  };
  
  const isManualSleepPayload = (value: unknown): value is ManualSleepPayload => {
    if (!isRecord(value)) return false;
    if (!isManualWindowBase(value)) return false;
    if (!hasNumber(value, 'totalMinutes')) return false;
    return typeof value.isMainSleep === 'boolean';
  };
  
  const isManualStepsPayload = (value: unknown): value is ManualStepsPayload => {
    if (!isRecord(value)) return false;
    if (!isManualWindowBase(value)) return false;
    return hasNumber(value, 'steps');
  };
  
  const isManualWorkoutPayload = (value: unknown): value is ManualWorkoutPayload => {
    if (!isRecord(value)) return false;
    if (!isManualWindowBase(value)) return false;
    return hasString(value, 'sport') && hasNumber(value, 'durationMinutes');
  };
  
  const isManualWeightPayload = (value: unknown): value is ManualWeightPayload => {
    if (!isRecord(value)) return false;
    return (
      hasString(value, 'time') &&
      hasString(value, 'day') &&
      hasString(value, 'timezone') &&
      hasNumber(value, 'weightKg')
    );
  };
  
  const isManualHrvPayload = (value: unknown): value is ManualHrvPayload => {
    if (!isRecord(value)) return false;
    return (
      hasString(value, 'time') &&
      hasString(value, 'day') &&
      hasString(value, 'timezone')
    );
  };
  
  const parseManualPayload = <K extends RawEvent['kind']>(
    kind: K,
    payload: unknown,
  ): ManualPayloadByKind[K] | null => {
    switch (kind) {
      case 'sleep':
        return (isManualSleepPayload(payload) ? payload : null) as ManualPayloadByKind[K];
      case 'steps':
        return (isManualStepsPayload(payload) ? payload : null) as ManualPayloadByKind[K];
      case 'workout':
        return (isManualWorkoutPayload(payload) ? payload : null) as ManualPayloadByKind[K];
      case 'weight':
        return (isManualWeightPayload(payload) ? payload : null) as ManualPayloadByKind[K];
      case 'hrv':
        return (isManualHrvPayload(payload) ? payload : null) as ManualPayloadByKind[K];
      default:
        return null;
    }
  };
  
  // -----------------------------------------------------------------------------
  // Manual mappers (provider === "manual")
  // -----------------------------------------------------------------------------
  
  const mapManualSleep = (
    raw: RawEvent,
    payload: ManualSleepPayload,
  ): SleepCanonicalEvent => ({
    id: raw.id,
    userId: raw.userId,
    sourceId: raw.sourceId,
    kind: 'sleep',
    start: payload.start,
    end: payload.end,
    day: payload.day,
    timezone: payload.timezone,
    createdAt: raw.receivedAt,
    updatedAt: raw.receivedAt,
    schemaVersion: 1,
    totalMinutes: payload.totalMinutes,
    efficiency: payload.efficiency ?? null,
    latencyMinutes: payload.latencyMinutes ?? null,
    awakenings: payload.awakenings ?? null,
    isMainSleep: payload.isMainSleep,
  });
  
  const mapManualSteps = (
    raw: RawEvent,
    payload: ManualStepsPayload,
  ): StepsCanonicalEvent => ({
    id: raw.id,
    userId: raw.userId,
    sourceId: raw.sourceId,
    kind: 'steps',
    start: payload.start,
    end: payload.end,
    day: payload.day,
    timezone: payload.timezone,
    createdAt: raw.receivedAt,
    updatedAt: raw.receivedAt,
    schemaVersion: 1,
    steps: payload.steps,
    distanceKm: payload.distanceKm ?? null,
    moveMinutes: payload.moveMinutes ?? null,
  });
  
  const mapManualWorkout = (
    raw: RawEvent,
    payload: ManualWorkoutPayload,
  ): WorkoutCanonicalEvent => {
    const base: WorkoutCanonicalEvent = {
      id: raw.id,
      userId: raw.userId,
      sourceId: raw.sourceId,
      kind: 'workout',
      start: payload.start,
      end: payload.end,
      day: payload.day,
      timezone: payload.timezone,
      createdAt: raw.receivedAt,
      updatedAt: raw.receivedAt,
      schemaVersion: 1,
      sport: payload.sport,
      durationMinutes: payload.durationMinutes,
      trainingLoad: payload.trainingLoad ?? null,
    };
  
    if (payload.intensity) {
      base.intensity = payload.intensity;
    }
  
    return base;
  };
  
  const mapManualWeight = (
    raw: RawEvent,
    payload: ManualWeightPayload,
  ): WeightCanonicalEvent => ({
    id: raw.id,
    userId: raw.userId,
    sourceId: raw.sourceId,
    kind: 'weight',
    start: payload.time,
    end: payload.time,
    day: payload.day,
    timezone: payload.timezone,
    createdAt: raw.receivedAt,
    updatedAt: raw.receivedAt,
    schemaVersion: 1,
    weightKg: payload.weightKg,
    bodyFatPercent: payload.bodyFatPercent ?? null,
  });
  
  const mapManualHrv = (
    raw: RawEvent,
    payload: ManualHrvPayload,
  ): HrvCanonicalEvent => {
    const base: HrvCanonicalEvent = {
      id: raw.id,
      userId: raw.userId,
      sourceId: raw.sourceId,
      kind: 'hrv',
      start: payload.time,
      end: payload.time,
      day: payload.day,
      timezone: payload.timezone,
      createdAt: raw.receivedAt,
      updatedAt: raw.receivedAt,
      schemaVersion: 1,
      rmssdMs: payload.rmssdMs ?? null,
      sdnnMs: payload.sdnnMs ?? null,
    };
  
    if (payload.measurementType) {
      base.measurementType = payload.measurementType;
    }
  
    return base;
  };
  
  // -----------------------------------------------------------------------------
  // Entry point
  // -----------------------------------------------------------------------------
  
  /**
   * Map a RawEvent into a CanonicalEvent.
   *
   * - Currently supports provider === "manual".
   * - Other providers (e.g. "apple_health", "oura") will be added later.
   */
  export const mapRawEventToCanonical = (raw: RawEvent): MappingResult => {
    if (raw.provider !== 'manual') {
      return {
        ok: false,
        reason: 'UNSUPPORTED_PROVIDER',
        details: {
          provider: raw.provider,
          kind: raw.kind,
          rawEventId: raw.id,
        },
      };
    }
  
    const parsed = parseManualPayload(raw.kind, raw.payload);
    if (!parsed) {
      return {
        ok: false,
        reason: 'MALFORMED_PAYLOAD',
        details: {
          provider: raw.provider,
          kind: raw.kind,
          rawEventId: raw.id,
        },
      };
    }
  
    switch (raw.kind) {
      case 'sleep':
        return { ok: true, canonical: mapManualSleep(raw, parsed as ManualSleepPayload) };
      case 'steps':
        return { ok: true, canonical: mapManualSteps(raw, parsed as ManualStepsPayload) };
      case 'workout':
        return { ok: true, canonical: mapManualWorkout(raw, parsed as ManualWorkoutPayload) };
      case 'weight':
        return { ok: true, canonical: mapManualWeight(raw, parsed as ManualWeightPayload) };
      case 'hrv':
        return { ok: true, canonical: mapManualHrv(raw, parsed as ManualHrvPayload) };
      default:
        return {
          ok: false,
          reason: 'UNSUPPORTED_KIND',
          details: {
            provider: raw.provider,
            kind: raw.kind,
            rawEventId: raw.id,
          },
        };
    }
  };
  