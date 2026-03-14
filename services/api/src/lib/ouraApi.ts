/**
 * Oura API v2 — token refresh and fetch sleep + daily_readiness (HRV).
 * Used by POST /integrations/oura/pull-now. OAuth token URL and scopes match integrations.ts.
 */

const OURA_TOKEN_URL = "https://api.ouraring.com/oauth/token";
const OURA_API_BASE = "https://api.ouraring.com/v2/usercollection";

/** Oura token refresh returns new access_token and new refresh_token (single-use). */
export type OuraTokenResult = {
  access_token: string;
  refresh_token: string;
  expires_in: number;
};

/** Minimal Oura API v2 sleep document (from GET /v2/usercollection/sleep). */
export type OuraSleepDocument = {
  id?: string;
  bed_time?: string;
  wake_time?: string;
  end_time?: string;
  total_sleep_duration?: number;
  efficiency?: number | null;
  latency?: number | null;
  restful_sleep?: number | null;
  awake_time?: number | null;
  type?: string;
  [key: string]: unknown;
};

/** Minimal Oura API v2 daily_readiness document (HRV in rmssd_5min or similar). */
export type OuraDailyReadinessDocument = {
  id?: string;
  day?: string;
  timestamp?: string;
  score?: number | null;
  rmssd_5min?: number | null;
  rmssd_5min_balance?: number | null;
  [key: string]: unknown;
};

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
 * GET /v2/usercollection/sleep?start_date=YYYY-MM-DD&end_date=YYYY-MM-DD
 */
export async function fetchOuraSleep(
  accessToken: string,
  startDate: string,
  endDate: string,
): Promise<OuraSleepDocument[]> {
  const url = new URL(`${OURA_API_BASE}/sleep`);
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
      "OURA_SLEEP_FETCH_FAILED",
      res.status,
    );
  }

  const json = (await res.json()) as { data?: OuraSleepDocument[]; next_token?: string };
  const data = Array.isArray(json.data) ? json.data : [];
  return data;
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
};

export type OuraHrvIngestItem = {
  idempotencyKey: string;
  time: string;
  timezone: string;
  day?: string;
  rmssdMs?: number | null;
  sdnnMs?: number | null;
  measurementType?: "nightly" | "spot";
};

function toYmd(iso: string): string {
  return iso.slice(0, 10);
}

export function mapOuraSleepToIngestItem(doc: OuraSleepDocument): OuraSleepIngestItem | null {
  const start = doc.bed_time ?? doc.end_time;
  const end = doc.wake_time ?? doc.end_time;
  if (!start || !end) return null;

  const totalSec = doc.total_sleep_duration ?? 0;
  const totalMinutes = Math.round(totalSec / 60);
  const efficiencyRaw = doc.efficiency;
  const efficiency =
    typeof efficiencyRaw === "number" && efficiencyRaw >= 0 && efficiencyRaw <= 100
      ? efficiencyRaw / 100
      : null;
  const latencyMinutes =
    typeof doc.latency === "number" && doc.latency >= 0 ? Math.round(doc.latency) : null;
  const awakenings =
    typeof (doc as { number_of_awakenings?: number }).number_of_awakenings === "number"
      ? (doc as { number_of_awakenings: number }).number_of_awakenings
      : null;
  const id = doc.id ?? `oura_sleep_${start}`;
  const isMainSleep = doc.type === "long_sleep" || doc.type === "sleep";

  return {
    idempotencyKey: String(id),
    start,
    end,
    timezone: "UTC",
    day: toYmd(start),
    totalMinutes,
    ...(efficiency != null ? { efficiency } : {}),
    ...(latencyMinutes != null ? { latencyMinutes } : {}),
    ...(awakenings != null ? { awakenings } : {}),
    isMainSleep,
  };
}

export function mapOuraReadinessToHrvItem(
  doc: OuraDailyReadinessDocument,
): OuraHrvIngestItem | null {
  const day = doc.day ?? (doc.timestamp ? toYmd(doc.timestamp) : null);
  const time = doc.timestamp ?? (doc.day ? `${doc.day}T12:00:00.000Z` : null);
  if (!day || !time) return null;

  const id = doc.id ?? `oura_hrv_${day}`;
  const rmssd = doc.rmssd_5min ?? doc.rmssd_5min_balance;
  const rmssdMs = typeof rmssd === "number" && rmssd >= 0 ? rmssd : null;

  return {
    idempotencyKey: String(id),
    time,
    timezone: "UTC",
    day,
    ...(rmssdMs != null ? { rmssdMs } : {}),
    measurementType: "nightly",
  };
}
