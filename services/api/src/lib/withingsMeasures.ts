/**
 * Phase 3B — Withings measure fetch (weight + body fat %).
 * Token custody: refresh token read only via withingsSecrets.getRefreshToken.
 * Never log secrets or access tokens.
 */

import * as withingsSecrets from "./withingsSecrets";

const WITHINGS_TOKEN_URL = "https://wbsapi.withings.net/v2/oauth2";
const WITHINGS_MEASURE_URL = "https://wbsapi.withings.net/measure";

/** Single weight sample with optional body fat. */
export type WithingsWeightSample = {
  measuredAtIso: string;
  weightKg: number;
  bodyFatPercent: number | null;
  idempotencyKey: string;
};

/** Thrown when refresh token missing or Withings API returns error. Callers must write FailureEntry or return 500. */
export class WithingsMeasureError extends Error {
  constructor(
    message: string,
    public readonly code: string,
  ) {
    super(message);
    this.name = "WithingsMeasureError";
    Object.setPrototypeOf(this, WithingsMeasureError.prototype);
  }
}

/**
 * Refresh access token using refresh_token from Secret Manager.
 * Never logs refresh_token or access_token.
 */
async function refreshAccessToken(uid: string): Promise<string> {
  const refreshToken = await withingsSecrets.getRefreshToken(uid);
  if (!refreshToken || typeof refreshToken !== "string") {
    throw new WithingsMeasureError("Refresh token missing", "WITHINGS_REFRESH_TOKEN_MISSING");
  }

  const clientId = process.env.WITHINGS_CLIENT_ID?.trim();
  const clientSecret = await withingsSecrets.getClientSecret();
  if (!clientId || !clientSecret) {
    throw new WithingsMeasureError("Withings OAuth not configured", "WITHINGS_OAUTH_MISCONFIG");
  }

  const body = new URLSearchParams({
    action: "requesttoken",
    grant_type: "refresh_token",
    client_id: clientId,
    client_secret: clientSecret,
    refresh_token: refreshToken,
  });

  const res = await fetch(WITHINGS_TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: body.toString(),
  });

  const json = (await res.json()) as {
    status?: number;
    body?: { access_token?: string; expires_in?: number; error?: string };
    error?: string;
  };

  if (res.status !== 200 || json.status !== 0) {
    const errMsg = json.body?.error ?? json.error ?? `HTTP ${res.status} (status=${String(json.status)})`;
    throw new WithingsMeasureError(errMsg, "WITHINGS_TOKEN_REFRESH_FAILED");
  }

  const accessToken = json.body?.access_token;
  if (!accessToken || typeof accessToken !== "string") {
    throw new WithingsMeasureError("No access_token in response", "WITHINGS_TOKEN_REFRESH_FAILED");
  }

  return accessToken;
}

/** Normalize numeric formatting for deterministic idempotency keys. */
function fmtFixed(n: number, decimals: number): string {
  // toFixed is deterministic for the same numeric value; we also guard against NaN/Infinity.
  if (!Number.isFinite(n)) return "NaN";
  return n.toFixed(decimals);
}

/**
 * Build deterministic idempotency key for a measurement.
 * If Withings provides stable measure group id (grpid): withings:weight:{uid}:{grpid}
 * Else: withings:weight:{uid}:{measuredAtIso}:{weightKgFixed}:{bodyFatFixedOrNull}
 */
function buildIdempotencyKey(
  uid: string,
  measuredAtIso: string,
  weightKg: number,
  bodyFatPercent: number | null,
  grpid?: number,
): string {
  if (grpid !== undefined && grpid !== null && Number.isInteger(grpid)) {
    return `withings:weight:${uid}:${grpid}`;
  }

  const weightFixed = fmtFixed(weightKg, 3); // kg precision
  const bfFixed = bodyFatPercent === null ? "null" : fmtFixed(bodyFatPercent, 2); // percent precision

  return `withings:weight:${uid}:${measuredAtIso}:${weightFixed}:${bfFixed}`;
}

/**
 * Measure type codes:
 * - 1 = weight (kg)
 * - 6 = fat ratio (%)
 *
 * Note: These codes are treated as contract for Phase 3B; tests must cover parsing behavior.
 */
const MEASURE_TYPE_WEIGHT = 1;
const MEASURE_TYPE_FAT_RATIO = 6;

/** Parse value from Withings measure (value * 10^unit). */
function scaleValue(value: number, unit: number): number {
  const factor = Math.pow(10, unit);
  return value * factor;
}

/**
 * Fetch weight (+ optional body fat %) from Withings measure API for the given time range.
 * Returns one sample per measurement group (same timestamp may have weight and fat).
 * Deterministic idempotency key per measurement. Never logs tokens.
 */
export async function fetchWithingsMeasures(
  uid: string,
  startMs: number,
  endMs: number,
): Promise<WithingsWeightSample[]> {
  if (!Number.isFinite(startMs) || !Number.isFinite(endMs) || endMs <= startMs) {
    throw new WithingsMeasureError("Invalid time window", "WITHINGS_WINDOW_INVALID");
  }

  const accessToken = await refreshAccessToken(uid);

  const body = new URLSearchParams({
    action: "getmeas",
    startdate: String(Math.floor(startMs / 1000)),
    enddate: String(Math.ceil(endMs / 1000)),
  });

  const res = await fetch(WITHINGS_MEASURE_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: body.toString(),
  });

  const json = (await res.json()) as {
    status?: number;
    body?: {
      error?: string;
      measuregrps?: {
        grpid?: number;
        date?: number;
        measures?: { type?: number; unit?: number; value?: number }[];
      }[];
    };
    error?: string;
  };

  if (res.status !== 200 || json.status !== 0) {
    const errMsg = json.body?.error ?? json.error ?? `HTTP ${res.status} (status=${String(json.status)})`;
    throw new WithingsMeasureError(errMsg, "WITHINGS_MEASURE_API_ERROR");
  }

  const measuregrps = json.body?.measuregrps;
  if (!Array.isArray(measuregrps)) {
    return [];
  }

  const out: WithingsWeightSample[] = [];

  for (const grp of measuregrps) {
    const dateUnix = grp.date;
    if (dateUnix == null || typeof dateUnix !== "number") continue;

    const measures = grp.measures as { type?: number; unit?: number; value?: number }[] | undefined;
    if (!Array.isArray(measures)) continue;

    let weightKg: number | null = null;
    let bodyFatPercent: number | null = null;

    for (const m of measures) {
      const type = m.type;
      const value = m.value;
      const unit = m.unit ?? 0;
      if (value == null || typeof value !== "number") continue;

      if (type === MEASURE_TYPE_WEIGHT) {
        const kg = scaleValue(value, unit);
        if (Number.isFinite(kg) && kg > 0) weightKg = kg;
      } else if (type === MEASURE_TYPE_FAT_RATIO) {
        const pct = scaleValue(value, unit);
        if (Number.isFinite(pct) && pct >= 0 && pct <= 100) bodyFatPercent = pct;
      }
    }

    // No silent drops: groups without weight are ignored (they are not "weight samples").
    if (weightKg == null || !Number.isFinite(weightKg) || weightKg <= 0) continue;

    const measuredAtIso = new Date(dateUnix * 1000).toISOString();
    const idempotencyKey = buildIdempotencyKey(uid, measuredAtIso, weightKg, bodyFatPercent, grp.grpid);

    out.push({
      measuredAtIso,
      weightKg,
      bodyFatPercent,
      idempotencyKey,
    });
  }

  // Deterministic ordering: same inputs => same output ordering.
  out.sort((a, b) => (a.measuredAtIso < b.measuredAtIso ? -1 : a.measuredAtIso > b.measuredAtIso ? 1 : a.idempotencyKey.localeCompare(b.idempotencyKey)));

  return out;
}
