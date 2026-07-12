/**
 * Oura API v2 — token refresh and fetch all supported datasets.
 * Used by POST /integrations/oura/pull-now. OAuth token URL and scopes match integrations.ts.
 */

import { logger } from "./logger";
import {
  normalizeOuraLatencyRawToMinutes,
  ouraSleepWakeIsoForLog,
  resolveOuraSleepIngestBase,
} from "./oura/resolveOuraSleepIngestBase";

export { normalizeOuraLatencyRawToMinutes, ouraSleepWakeIsoForLog, resolveOuraSleepIngestBase };

const OURA_TOKEN_URL = "https://api.ouraring.com/oauth/token";
const OURA_API_BASE = "https://api.ouraring.com/v2/usercollection";

/** Follow `next_token` up to this many list API pages (Oura returns bounded `data` per call). */
const OURA_SLEEP_FETCH_MAX_PAGES = 100;

/** Oura token refresh returns new access_token and new refresh_token (single-use). */
export type OuraTokenResult = {
  access_token: string;
  refresh_token: string;
  expires_in: number;
};

/** Minimal Oura API v2 sleep document (from GET /v2/usercollection/sleep). */
export type OuraSleepDocument = {
  id?: string;
  /** Oura sleep period date (YYYY-MM-DD); aligns with app wake-day / nightly score row. */
  day?: string;
  bed_time?: string;
  wake_time?: string;
  end_time?: string;
  /** Oura API v2 alternate: bedtime_start (ISO). */
  bedtime_start?: string;
  /** Oura API v2 alternate: bedtime_end (ISO). */
  bedtime_end?: string;
  /** Oura API v2 alternate: start (ISO). */
  start?: string;
  /** Oura API v2 alternate: end (ISO). */
  end?: string;
  total_sleep_duration?: number;
  efficiency?: number | null;
  latency?: number | null;
  restful_sleep?: number | null;
  awake_time?: number | null;
  type?: string;
  /** Lowest HR during this sleep period (bpm) — matches Oura app sleep summary. */
  lowest_heart_rate?: number | null;
  /** Average HRV during this sleep period (ms). */
  average_hrv?: number | null;
  [key: string]: unknown;
};

/** Minimal Oura API v2 daily_readiness document (HRV in rmssd_5min or similar). */
export type OuraDailyReadinessDocument = {
  id?: string;
  day?: string;
  timestamp?: string;
  score?: number | null;
  /** Legacy / alternate HRV fields (ms) when present. */
  rmssd_5min?: number | null;
  rmssd_5min_balance?: number | null;
  /** Public daily_readiness model: nightly HRV aggregate in ms (see Oura API v2 docs). */
  average_hrv?: number | null;
  /** Nightly average heart rate (bpm) — used for resting HR proxy when present. */
  average_heart_rate?: number | null;
  lowest_heart_rate?: number | null;
  [key: string]: unknown;
};

/**
 * Oura API v2 daily_sleep — calendar-day Sleep Score + contributors.
 * Distinct from `/sleep` period documents (duration/stages); this is the Daily Sleep summary.
 */
export type OuraDailySleepDocument = {
  id?: string;
  day?: string;
  timestamp?: string;
  score?: number | null;
  contributors?: Record<string, unknown>;
  [key: string]: unknown;
};

/**
 * Oura API v2 daily_stress — calendar-day stress summary.
 * `day_summary`: restored | normal | stressful (nullable).
 * `stress_high` / `recovery_high`: seconds (number | null).
 */
export type OuraDailyStressDocument = {
  id?: string;
  day?: string;
  day_summary?: "restored" | "normal" | "stressful" | null;
  stress_high?: number | null;
  recovery_high?: number | null;
  [key: string]: unknown;
};

/** Oura API v2 personal_info — single doc per user. */
export type OuraPersonalInfoDocument = Record<string, unknown>;

/** Oura API v2 daily_activity — daily summary (steps, activity, etc.). */
export type OuraDailyActivityDocument = {
  id?: string;
  day?: string;
  steps?: number | null;
  active_calories?: number | null;
  total_calories?: number | null;
  low_activity_seconds?: number | null;
  medium_activity_seconds?: number | null;
  high_activity_seconds?: number | null;
  [key: string]: unknown;
};

/** Oura API v2 workout — single workout. */
export type OuraWorkoutDocument = {
  id?: string;
  activity?: string;
  calories?: number | null;
  day?: string;
  distance?: number | null;
  end_datetime?: string;
  intensity?: string | null;
  label?: string | null;
  source?: string | null;
  start_datetime?: string;
  [key: string]: unknown;
};

/** Oura API v2 session — guided/unguided session. */
export type OuraSessionDocument = Record<string, unknown>;

/** Oura API v2 tag — user tag. */
export type OuraTagDocument = Record<string, unknown>;

/** Oura API v2 spo2 — SpO2 daily. */
export type OuraSpo2Document = Record<string, unknown>;

/** Oura API v2 heartrate — time series (Gen 3). */
export type OuraHeartrateDocument = Record<string, unknown>;

export class OuraApiError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly status?: number,
  ) {
    super(message);
    this.name = "OuraApiError";
  }
}

/**
 * Exchange refresh_token for new access_token and refresh_token.
 * Caller must persist the new refresh_token (Oura refresh tokens are single-use).
 */
export async function refreshOuraAccessToken(
  refreshToken: string,
  clientId: string,
  clientSecret: string,
): Promise<OuraTokenResult> {
  const res = await fetch(OURA_TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "refresh_token",
      refresh_token: refreshToken,
      client_id: clientId,
      client_secret: clientSecret,
    }),
  });

  const json = (await res.json()) as {
    access_token?: string;
    refresh_token?: string;
    expires_in?: number;
    error?: string;
    error_description?: string;
  };

  if (res.status !== 200 || json.error) {
    const msg = json.error_description ?? json.error ?? `HTTP ${res.status}`;
    throw new OuraApiError(msg, "OURA_TOKEN_REFRESH_FAILED", res.status);
  }

  const access_token = json.access_token;
  const refresh_token = json.refresh_token;
  if (!access_token || !refresh_token || typeof json.expires_in !== "number") {
    throw new OuraApiError("Invalid token response", "OURA_TOKEN_INVALID", res.status);
  }

  return {
    access_token,
    refresh_token,
    expires_in: json.expires_in,
  };
}

/**
 * GET /v2/usercollection/sleep?start_date=YYYY-MM-DD&end_date=YYYY-MM-DD[&next_token=...]
 *
 * Paginates with `next_token` from the JSON body until no further page. Repo bug was returning only
 * the first page, so the newest sleep row was absent whenever it landed on page 2+.
 */
export async function fetchOuraSleep(
  accessToken: string,
  startDate: string,
  endDate: string,
  options?: { requestId?: string; uid?: string },
): Promise<OuraSleepDocument[]> {
  const aggregated: OuraSleepDocument[] = [];
  let nextRequestToken: string | undefined;
  let pages = 0;

  for (;;) {
    const url = new URL(`${OURA_API_BASE}/sleep`);
    url.searchParams.set("start_date", startDate);
    url.searchParams.set("end_date", endDate);
    if (nextRequestToken) {
      url.searchParams.set("next_token", nextRequestToken);
    }

    const res = await fetch(url.toString(), {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    if (res.status === 401) {
      throw new OuraApiError("Unauthorized", "OURA_UNAUTHORIZED", 401);
    }
    if (res.status !== 200) {
      const text = await res.text();
      throw new OuraApiError(
        text || `HTTP ${res.status}`,
        "OURA_SLEEP_FETCH_FAILED",
        res.status,
      );
    }

    const json = (await res.json()) as { data?: OuraSleepDocument[]; next_token?: string };
    const chunk = Array.isArray(json.data) ? json.data : [];
    aggregated.push(...chunk);
    pages += 1;

    const responseNext =
      typeof json.next_token === "string" && json.next_token.length > 0 ? json.next_token : undefined;

    if (!responseNext) {
      break;
    }
    if (pages >= OURA_SLEEP_FETCH_MAX_PAGES) {
      logger.error({
        msg: "oura_sleep_fetch_page_cap",
        startDate,
        endDate,
        pages,
        ...(options?.requestId ? { requestId: options.requestId } : {}),
        ...(options?.uid ? { uid: options.uid } : {}),
      });
      break;
    }
    nextRequestToken = responseNext;
  }

  logger.info({
    msg: "oura_sleep_fetch_complete",
    startDate,
    endDate,
    pages,
    rowCount: aggregated.length,
    ...(options?.requestId ? { requestId: options.requestId } : {}),
    ...(options?.uid ? { uid: options.uid } : {}),
  });

  return aggregated;
}

/**
 * GET /v2/usercollection/daily_readiness?start_date=...&end_date=...
 * Used for HRV (rmssd); day + timestamp identify the document.
 */
export async function fetchOuraDailyReadiness(
  accessToken: string,
  startDate: string,
  endDate: string,
): Promise<OuraDailyReadinessDocument[]> {
  const url = new URL(`${OURA_API_BASE}/daily_readiness`);
  url.searchParams.set("start_date", startDate);
  url.searchParams.set("end_date", endDate);

  const res = await fetch(url.toString(), {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (res.status === 401) {
    throw new OuraApiError("Unauthorized", "OURA_UNAUTHORIZED", 401);
  }
  if (res.status !== 200) {
    const text = await res.text();
    throw new OuraApiError(
      text || `HTTP ${res.status}`,
      "OURA_READINESS_FETCH_FAILED",
      res.status,
    );
  }

  const json = (await res.json()) as {
    data?: OuraDailyReadinessDocument[];
    next_token?: string;
  };
  const data = Array.isArray(json.data) ? json.data : [];
  return data;
}

/**
 * GET /v2/usercollection/daily_sleep?start_date=...&end_date=...[&next_token=...]
 * Calendar-day Sleep Score + contributors (not individual sleep periods).
 * Paginates with `next_token` until exhausted (same contract as {@link fetchOuraSleep}).
 */
export async function fetchOuraDailySleep(
  accessToken: string,
  startDate: string,
  endDate: string,
  options?: { requestId?: string; uid?: string },
): Promise<OuraDailySleepDocument[]> {
  const aggregated: OuraDailySleepDocument[] = [];
  let nextRequestToken: string | undefined;
  let pages = 0;

  for (;;) {
    const url = new URL(`${OURA_API_BASE}/daily_sleep`);
    url.searchParams.set("start_date", startDate);
    url.searchParams.set("end_date", endDate);
    if (nextRequestToken) {
      url.searchParams.set("next_token", nextRequestToken);
    }

    const res = await fetch(url.toString(), {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    if (res.status === 401) {
      throw new OuraApiError("Unauthorized", "OURA_UNAUTHORIZED", 401);
    }
    if (res.status !== 200) {
      const text = await res.text();
      throw new OuraApiError(
        text || `HTTP ${res.status}`,
        "OURA_DAILY_SLEEP_FETCH_FAILED",
        res.status,
      );
    }

    const json = (await res.json()) as {
      data?: OuraDailySleepDocument[];
      next_token?: string;
    };
    const chunk = Array.isArray(json.data) ? json.data : [];
    aggregated.push(...chunk);
    pages += 1;

    const token =
      typeof json.next_token === "string" && json.next_token.trim().length > 0
        ? json.next_token.trim()
        : undefined;
    if (!token) break;
    nextRequestToken = token;
    if (pages >= 50) {
      logger.warn({
        msg: "oura_daily_sleep_fetch_page_cap",
        startDate,
        endDate,
        pages,
        rowCount: aggregated.length,
        ...(options?.requestId ? { requestId: options.requestId } : {}),
        ...(options?.uid ? { uid: options.uid } : {}),
      });
      break;
    }
  }

  logger.info({
    msg: "oura_daily_sleep_fetch_complete",
    startDate,
    endDate,
    pages,
    rowCount: aggregated.length,
    ...(options?.requestId ? { requestId: options.requestId } : {}),
    ...(options?.uid ? { uid: options.uid } : {}),
  });

  return aggregated;
}

/** Follow `next_token` up to this many daily_stress list pages. */
const OURA_DAILY_STRESS_FETCH_MAX_PAGES = 50;

/**
 * GET /v2/usercollection/daily_stress?start_date=...&end_date=...[&next_token=...]
 * Paginates with `next_token` until exhausted (same contract as {@link fetchOuraDailySleep}).
 * Routine logs are privacy-safe aggregates only (counts / pages — no days, values, or tokens).
 */
export async function fetchOuraDailyStress(
  accessToken: string,
  startDate: string,
  endDate: string,
  options?: { requestId?: string },
): Promise<OuraDailyStressDocument[]> {
  const aggregated: OuraDailyStressDocument[] = [];
  let nextRequestToken: string | undefined;
  let pages = 0;

  for (;;) {
    const url = new URL(`${OURA_API_BASE}/daily_stress`);
    url.searchParams.set("start_date", startDate);
    url.searchParams.set("end_date", endDate);
    if (nextRequestToken) {
      url.searchParams.set("next_token", nextRequestToken);
    }

    const res = await fetch(url.toString(), {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    if (res.status === 401) {
      throw new OuraApiError("Unauthorized", "OURA_UNAUTHORIZED", 401);
    }
    if (res.status !== 200) {
      const text = await res.text();
      throw new OuraApiError(
        text || `HTTP ${res.status}`,
        "OURA_DAILY_STRESS_FETCH_FAILED",
        res.status,
      );
    }

    const json = (await res.json()) as {
      data?: OuraDailyStressDocument[];
      next_token?: string;
    };
    const chunk = Array.isArray(json.data) ? json.data : [];
    aggregated.push(...chunk);
    pages += 1;

    const token =
      typeof json.next_token === "string" && json.next_token.trim().length > 0
        ? json.next_token.trim()
        : undefined;
    if (!token) break;
    nextRequestToken = token;
    if (pages >= OURA_DAILY_STRESS_FETCH_MAX_PAGES) {
      logger.warn({
        msg: "oura_daily_stress_fetch_page_cap",
        pages,
        rowCount: aggregated.length,
        ...(options?.requestId ? { requestId: options.requestId } : {}),
      });
      break;
    }
  }

  logger.info({
    msg: "oura_daily_stress_fetch_complete",
    pages,
    rowCount: aggregated.length,
    ...(options?.requestId ? { requestId: options.requestId } : {}),
  });

  return aggregated;
}

/**
 * Generic GET /v2/usercollection/{path} with optional start_date/end_date.
 */
async function fetchOuraCollection<T>(
  accessToken: string,
  path: string,
  startDate?: string,
  endDate?: string,
): Promise<T[]> {
  const url = new URL(`${OURA_API_BASE}/${path}`);
  if (startDate) url.searchParams.set("start_date", startDate);
  if (endDate) url.searchParams.set("end_date", endDate);

  const res = await fetch(url.toString(), {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (res.status === 401) {
    throw new OuraApiError("Unauthorized", "OURA_UNAUTHORIZED", 401);
  }
  if (res.status !== 200) {
    const text = await res.text();
    throw new OuraApiError(
      text || `HTTP ${res.status}`,
      "OURA_FETCH_FAILED",
      res.status,
    );
  }

  const json = (await res.json()) as { data?: T[]; next_token?: string };
  return Array.isArray(json.data) ? json.data : [];
}

/** GET /v2/usercollection/personal_info — no date params. */
export async function fetchOuraPersonalInfo(
  accessToken: string,
): Promise<OuraPersonalInfoDocument | null> {
  const list = await fetchOuraCollection<OuraPersonalInfoDocument>(
    accessToken,
    "personal_info",
  );
  return list.length > 0 ? list[0]! : null;
}

/** GET /v2/usercollection/daily_activity?start_date=...&end_date=... */
export async function fetchOuraDailyActivity(
  accessToken: string,
  startDate: string,
  endDate: string,
): Promise<OuraDailyActivityDocument[]> {
  return fetchOuraCollection<OuraDailyActivityDocument>(
    accessToken,
    "daily_activity",
    startDate,
    endDate,
  );
}

/** GET /v2/usercollection/workout?start_date=...&end_date=... */
export async function fetchOuraWorkouts(
  accessToken: string,
  startDate: string,
  endDate: string,
): Promise<OuraWorkoutDocument[]> {
  return fetchOuraCollection<OuraWorkoutDocument>(
    accessToken,
    "workout",
    startDate,
    endDate,
  );
}

/** GET /v2/usercollection/session?start_date=...&end_date=... */
export async function fetchOuraSessions(
  accessToken: string,
  startDate: string,
  endDate: string,
): Promise<OuraSessionDocument[]> {
  return fetchOuraCollection<OuraSessionDocument>(
    accessToken,
    "session",
    startDate,
    endDate,
  );
}

/** GET /v2/usercollection/tag?start_date=...&end_date=... */
export async function fetchOuraTags(
  accessToken: string,
  startDate: string,
  endDate: string,
): Promise<OuraTagDocument[]> {
  return fetchOuraCollection<OuraTagDocument>(
    accessToken,
    "tag",
    startDate,
    endDate,
  );
}

/** GET /v2/usercollection/daily_spo2?start_date=...&end_date=... (spo2Daily scope). */
export async function fetchOuraSpo2(
  accessToken: string,
  startDate: string,
  endDate: string,
): Promise<OuraSpo2Document[]> {
  return fetchOuraCollection<OuraSpo2Document>(
    accessToken,
    "daily_spo2",
    startDate,
    endDate,
  );
}

/** GET /v2/usercollection/heartrate?start_datetime=...&end_datetime=... (ISO). */
export async function fetchOuraHeartrate(
  accessToken: string,
  startDatetime: string,
  endDatetime: string,
): Promise<OuraHeartrateDocument[]> {
  const url = new URL(`${OURA_API_BASE}/heartrate`);
  url.searchParams.set("start_datetime", startDatetime);
  url.searchParams.set("end_datetime", endDatetime);

  const res = await fetch(url.toString(), {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (res.status === 401) {
    throw new OuraApiError("Unauthorized", "OURA_UNAUTHORIZED", 401);
  }
  if (res.status !== 200) {
    const text = await res.text();
    throw new OuraApiError(
      text || `HTTP ${res.status}`,
      "OURA_FETCH_FAILED",
      res.status,
    );
  }

  const json = (await res.json()) as { data?: OuraHeartrateDocument[] };
  return Array.isArray(json.data) ? json.data : [];
}

// Ingest item shapes (must match ouraIngest / ouraIngestWrite contract)
export type OuraSleepIngestItem = {
  idempotencyKey: string;
  start: string;
  end: string;
  timezone: string;
  day?: string;
  totalMinutes: number;
  efficiency?: number | null;
  latencyMinutes?: number | null;
  awakenings?: number | null;
  isMainSleep: boolean;
  /** Stage durations in minutes when Oura reports rem_sleep_duration / deep_sleep_duration */
  remSleepMinutes?: number | null;
  deepSleepMinutes?: number | null;
};

export type OuraHrvIngestItem = {
  idempotencyKey: string;
  time: string;
  timezone: string;
  day?: string;
  rmssdMs?: number | null;
  sdnnMs?: number | null;
  measurementType?: "nightly" | "spot";
  /** From daily_readiness `average_heart_rate` / `lowest_heart_rate` when present (bpm). */
  restingHeartRateBpm?: number | null;
};

/** Steps-like item from Oura daily_activity (maps to canonical steps). */
export type OuraStepsIngestItem = {
  idempotencyKey: string;
  start: string;
  end: string;
  timezone: string;
  day?: string;
  steps: number;
  distanceKm?: number | null;
  moveMinutes?: number | null;
};

/** Workout-like item from Oura workout (maps to canonical workout). */
export type OuraWorkoutIngestItem = {
  idempotencyKey: string;
  start: string;
  end: string;
  timezone: string;
  day?: string;
  sport: string;
  durationMinutes: number;
  intensity?: "easy" | "moderate" | "hard" | null;
  trainingLoad?: number | null;
};

/** Raw-only Oura blob (session, tag, spo2, heartrate, personal). */
export type OuraRawIngestItem = {
  idempotencyKey: string;
  dataset: string;
  data: Record<string, unknown>;
};

function toYmd(iso: string): string {
  return iso.slice(0, 10);
}

export function mapOuraSleepToIngestItem(doc: OuraSleepDocument): OuraSleepIngestItem | null {
  const resolved = resolveOuraSleepIngestBase(doc);
  if (!resolved) return null;
  const { start, end, rollupDay } = resolved;
  const totalSec = typeof doc.total_sleep_duration === "number" ? doc.total_sleep_duration : 0;

  const totalMinutes = Math.round(totalSec / 60);
  const efficiencyRaw = doc.efficiency;
  /** Oura may send 0–100 (percent) or 0–1 (ratio). */
  let efficiency: number | null = null;
  if (typeof efficiencyRaw === "number" && efficiencyRaw >= 0 && efficiencyRaw <= 100) {
    efficiency = efficiencyRaw > 1 ? efficiencyRaw / 100 : efficiencyRaw;
  }
  const latencyMinutes =
    typeof doc.latency === "number" && doc.latency >= 0
      ? normalizeOuraLatencyRawToMinutes(doc.latency)
      : null;
  const awakenings =
    typeof (doc as { number_of_awakenings?: number }).number_of_awakenings === "number"
      ? (doc as { number_of_awakenings: number }).number_of_awakenings
      : null;

  const remSec = typeof (doc as { rem_sleep_duration?: number }).rem_sleep_duration === "number"
    ? (doc as { rem_sleep_duration: number }).rem_sleep_duration
    : null;
  const remSleepMinutes =
    remSec != null && remSec >= 0 ? Math.round(remSec / 60) : null;

  const deepSec = typeof (doc as { deep_sleep_duration?: number }).deep_sleep_duration === "number"
    ? (doc as { deep_sleep_duration: number }).deep_sleep_duration
    : null;
  const deepSleepMinutes =
    deepSec != null && deepSec >= 0 ? Math.round(deepSec / 60) : null;

  const id = doc.id ?? `oura_sleep_${start}`;
  /** Only nightly long_sleep counts as main; Oura `sleep` periods are naps/rest on the same day key. */
  const isMainSleep = doc.type === "long_sleep";

  return {
    idempotencyKey: String(id),
    start,
    end,
    timezone: "UTC",
    day: rollupDay,
    totalMinutes,
    ...(efficiency != null ? { efficiency } : {}),
    ...(latencyMinutes != null ? { latencyMinutes } : {}),
    ...(awakenings != null ? { awakenings } : {}),
    ...(remSleepMinutes != null ? { remSleepMinutes } : {}),
    ...(deepSleepMinutes != null ? { deepSleepMinutes } : {}),
    isMainSleep,
  };
}

/** RMSSD / balance first, then `average_hrv` — matches canonical HRV ingest expectations. */
function pickOuraReadinessRmssdMsForHrvIngest(doc: OuraDailyReadinessDocument): number | null {
  const candidates = [doc.rmssd_5min, doc.rmssd_5min_balance, doc.average_hrv];
  for (const c of candidates) {
    if (typeof c === "number" && Number.isFinite(c) && c >= 0) return c;
  }
  return null;
}

export function pickOuraReadinessAverageHrvMs(doc: OuraDailyReadinessDocument): number | null {
  if (typeof doc.average_hrv === "number" && Number.isFinite(doc.average_hrv) && doc.average_hrv >= 0) {
    return doc.average_hrv;
  }
  const cands = [doc.rmssd_5min, doc.rmssd_5min_balance];
  for (const c of cands) {
    if (typeof c === "number" && Number.isFinite(c) && c >= 0) return c;
  }
  return null;
}

/** Lowest heart rate (bpm) from Oura daily_readiness only — not average HR. */
export function pickOuraReadinessLowestHeartRateBpm(doc: OuraDailyReadinessDocument): number | null {
  const low = doc.lowest_heart_rate;
  if (typeof low === "number" && Number.isFinite(low) && low >= 30 && low <= 220) return Math.round(low);
  return null;
}

function pickOuraReadinessRestingHeartRateBpm(doc: OuraDailyReadinessDocument): number | null {
  const avg = doc.average_heart_rate;
  if (typeof avg === "number" && Number.isFinite(avg) && avg >= 30 && avg <= 220) return avg;
  const low = doc.lowest_heart_rate;
  if (typeof low === "number" && Number.isFinite(low) && low >= 30 && low <= 220) return low;
  return null;
}

export function mapOuraReadinessToHrvItem(
  doc: OuraDailyReadinessDocument,
): OuraHrvIngestItem | null {
  const day = doc.day ?? (doc.timestamp ? toYmd(doc.timestamp) : null);
  const time = doc.timestamp ?? (doc.day ? `${doc.day}T12:00:00.000Z` : null);
  if (!day || !time) return null;

  const id = doc.id ?? `oura_hrv_${day}`;
  const rmssdMs = pickOuraReadinessRmssdMsForHrvIngest(doc);
  const restingHeartRateBpm = pickOuraReadinessRestingHeartRateBpm(doc);

  return {
    idempotencyKey: String(id),
    time,
    timezone: "UTC",
    day,
    ...(rmssdMs != null ? { rmssdMs } : {}),
    ...(restingHeartRateBpm != null ? { restingHeartRateBpm } : {}),
    measurementType: "nightly",
  };
}

export function mapOuraDailyActivityToStepsItem(
  doc: OuraDailyActivityDocument,
): OuraStepsIngestItem | null {
  const day = doc.day ?? (doc as { date?: string }).date;
  if (!day || typeof day !== "string") return null;
  const steps = typeof doc.steps === "number" && doc.steps >= 0 ? doc.steps : 0;
  const id = doc.id ?? `oura_activity_${day}`;
  const low = typeof doc.low_activity_seconds === "number" ? doc.low_activity_seconds : 0;
  const medium = typeof doc.medium_activity_seconds === "number" ? doc.medium_activity_seconds : 0;
  const high = typeof doc.high_activity_seconds === "number" ? doc.high_activity_seconds : 0;
  const moveMinutes = Math.round((low + medium + high) / 60);
  return {
    idempotencyKey: String(id),
    start: `${day}T00:00:00.000Z`,
    end: `${day}T23:59:59.999Z`,
    timezone: "UTC",
    day,
    steps,
    ...(moveMinutes > 0 ? { moveMinutes } : {}),
  };
}

export function mapOuraWorkoutToWorkoutItem(
  doc: OuraWorkoutDocument,
): OuraWorkoutIngestItem | null {
  const start = doc.start_datetime ?? doc.day ? `${doc.day}T12:00:00.000Z` : null;
  const end = doc.end_datetime ?? start;
  if (!start || !end) return null;
  const id = doc.id ?? `oura_workout_${start}`;
  const sport = (doc.activity ?? doc.label ?? "workout") as string;
  const startDate = new Date(start);
  const endDate = new Date(end);
  const durationMinutes = Math.max(
    1,
    Math.round((endDate.getTime() - startDate.getTime()) / 60000),
  );
  const intensity =
    doc.intensity === "easy" || doc.intensity === "moderate" || doc.intensity === "hard"
      ? doc.intensity
      : null;
  const trainingLoad =
    typeof doc.calories === "number" && doc.calories >= 0 ? doc.calories : null;
  return {
    idempotencyKey: String(id),
    start,
    end,
    timezone: "UTC",
    day: toYmd(start),
    sport: String(sport),
    durationMinutes,
    ...(intensity != null ? { intensity } : {}),
    ...(trainingLoad != null ? { trainingLoad } : {}),
  };
}

/** Build oura_raw ingest item from API document. */
export function toOuraRawIngestItem(
  dataset: string,
  id: string,
  data: Record<string, unknown>,
): OuraRawIngestItem {
  return {
    idempotencyKey: id,
    dataset,
    data,
  };
}
