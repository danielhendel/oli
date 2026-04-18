/**
 * Activity guarantee: re-pull HealthKit + POST /ingest for the **previous local calendar day**
 * when server rolls (dailyFacts) disagree with HealthKit. Skips ingest only when stored steps
 * already match HK. After ingest, polls dailyFacts until it matches HK or timeout (async pipeline).
 */

import { Platform } from "react-native";

import { ingestRawEvent } from "@/lib/api/ingest";
import { getDailyFacts } from "@/lib/api/usersMe";
import type { DailyFactsDto } from "@/lib/contracts/dailyFacts";
import { truthOutcomeFromApiResult } from "@/lib/data/truthOutcome";
import { buildAppleHealthStepsIngestBody } from "@/lib/integrations/appleHealth/appleHealthStepsIngestBody";
import {
  addLocalCalendarDaysToDayKey,
  getLocalCalendarDayBoundsFromYmd,
  pullStepCountForLocalCalendarDay,
  requestPermissions,
} from "@/lib/integrations/appleHealth/healthKit";
import { stepsIdempotencyKey } from "@/lib/integrations/appleHealth/idempotency";
import { getAppleHealthConnected, setLastIngestedStepsForDay } from "@/lib/integrations/appleHealth/storage";
import { getTodayDayKeyLocal } from "@/lib/ui/calendar/dateUtils";

const VERIFY_POLL_INTERVAL_MS = 500;
const VERIFY_POLL_MAX_MS = 45_000;

function roundSteps(n: number): number {
  return Math.round(n);
}

function stepsFromDailyFactsDto(d: DailyFactsDto): number | null {
  const s = d.activity?.steps;
  if (typeof s === "number" && Number.isFinite(s) && s >= 0) return roundSteps(s);
  return null;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function fetchStoredStepsForDay(dayYmd: string, token: string): Promise<number | null> {
  const res = await getDailyFacts(dayYmd, token, { cacheBust: `compare:${Date.now()}` });
  const outcome = truthOutcomeFromApiResult(res);
  if (outcome.status !== "ready") return null;
  return stepsFromDailyFactsDto(outcome.data);
}

async function waitUntilDailyFactsMatchesHk(params: {
  yesterdayYmd: string;
  token: string;
  hkStepsRounded: number;
}): Promise<void> {
  const deadline = Date.now() + VERIFY_POLL_MAX_MS;
  while (Date.now() < deadline) {
    const stored = await fetchStoredStepsForDay(params.yesterdayYmd, params.token);
    if (stored !== null && stored === params.hkStepsRounded) return;
    await sleep(VERIFY_POLL_INTERVAL_MS);
  }
}

function getDeviceTimezoneIana(): string {
  try {
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
    return typeof tz === "string" && tz.length ? tz : "UTC";
  } catch {
    return "UTC";
  }
}

/**
 * Pulls Apple Health cumulative steps for local yesterday; compares to GET /users/me/daily-facts.
 * POSTs ingest only on mismatch or missing stored steps; then polls dailyFacts until it matches HK
 * (bounded) so HTTP 202 is not treated as sufficient for correctness.
 */
export async function runForcedLocalYesterdayAppleHealthStepsIngest(
  getIdToken: (forceRefresh?: boolean) => Promise<string | null>,
): Promise<void> {
  if (Platform.OS !== "ios") return;

  const connected = await getAppleHealthConnected().catch(() => false);
  if (!connected) return;

  const token = await getIdToken(false);
  if (!token) return;

  const todayKey = getTodayDayKeyLocal();
  const yesterdayYmd = addLocalCalendarDaysToDayKey(todayKey, -1);

  const perm = await requestPermissions();
  if (!perm.ok) return;

  const pulled = await pullStepCountForLocalCalendarDay(yesterdayYmd);
  if (!pulled.ok) return;

  const hkStepsRounded = roundSteps(pulled.steps);
  const storedSteps = await fetchStoredStepsForDay(yesterdayYmd, token);
  if (storedSteps !== null && storedSteps === hkStepsRounded) {
    await setLastIngestedStepsForDay(yesterdayYmd, hkStepsRounded);
    return;
  }

  const timezone = getDeviceTimezoneIana();
  const { start, end } = getLocalCalendarDayBoundsFromYmd(yesterdayYmd);
  const body = buildAppleHealthStepsIngestBody({
    start,
    end,
    day: yesterdayYmd,
    timezone,
    steps: pulled.steps,
  });

  const res = await ingestRawEvent(body, token, {
    idempotencyKey: stepsIdempotencyKey(yesterdayYmd),
    timeoutMs: 15000,
  });

  if (!res.ok) return;

  await setLastIngestedStepsForDay(yesterdayYmd, hkStepsRounded);
  await waitUntilDailyFactsMatchesHk({ yesterdayYmd, token, hkStepsRounded });
}
