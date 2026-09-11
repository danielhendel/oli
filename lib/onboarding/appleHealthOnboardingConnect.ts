// lib/onboarding/appleHealthOnboardingConnect.ts
/**
 * Explicit Apple Health connect for onboarding (and reusable from devices).
 * Device HealthKit permission ≠ account connection.
 * Sets the local connected flag only after permissions succeed, then runs a bounded sync.
 */

import { Platform } from "react-native";

import { ingestRawEvent } from "@/lib/api/ingest";
import { scheduleAppleHealthStepsRepair } from "@/lib/data/activity/appleHealthStepsRepairCoordinator";
import {
  appleHealthBodyCompositionIdempotencyKey,
  appleHealthBodyWeightIdempotencyKey,
  pullBodyCompositionSamples,
  requestPermissions,
  runAppleHealthBodySync,
} from "@/lib/integrations/appleHealth";
import {
  getAppleHealthConnected,
  getAppleHealthNotAvailable,
  setAppleHealthBodyLastCheckedAt,
  setAppleHealthConnected,
  setLastSyncAt,
} from "@/lib/integrations/appleHealth/storage";
import { nowIso } from "@/lib/sync/throttle";

const DAYS_BACK = 45;

function isoDaysAgo(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return d.toISOString();
}

function getDeviceTimezone(): string {
  try {
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
    return typeof tz === "string" && tz.length ? tz : "UTC";
  } catch {
    return "UTC";
  }
}

export type AppleHealthOnboardingConnectResult =
  | { ok: true; alreadyConnected: boolean }
  | { ok: false; reason: "unavailable" | "permission_denied" | "sync_failed" | "no_token" | "not_ios" };

export async function connectAppleHealthForOnboarding(args: {
  getIdToken: (forceRefresh?: boolean) => Promise<string | null>;
  userUid?: string;
}): Promise<AppleHealthOnboardingConnectResult> {
  if (Platform.OS !== "ios") {
    return { ok: false, reason: "not_ios" };
  }

  const notAvailable = await getAppleHealthNotAvailable().catch(() => false);
  if (notAvailable) {
    return { ok: false, reason: "unavailable" };
  }

  const wasConnected = await getAppleHealthConnected().catch(() => false);

  const perm = await requestPermissions();
  if (!perm.ok) {
    return { ok: false, reason: "permission_denied" };
  }

  // Explicit connect: mark account-connected only after permission grant.
  await setAppleHealthConnected(true).catch(() => undefined);

  const token = await args.getIdToken(false);
  if (!token) {
    return { ok: false, reason: "no_token" };
  }

  const result = await runAppleHealthBodySync(
    {
      token,
      startDate: isoDaysAgo(DAYS_BACK),
      endDate: new Date().toISOString(),
      limit: 200,
    },
    {
      pullBodyCompositionSamples,
      ingestRawEvent,
      appleHealthBodyWeightIdempotencyKey,
      appleHealthBodyCompositionIdempotencyKey,
      getDeviceTimezone,
    },
  );

  await setAppleHealthBodyLastCheckedAt(nowIso()).catch(() => undefined);

  if (!result.ok) {
    return { ok: false, reason: "sync_failed" };
  }

  await setLastSyncAt(nowIso()).catch(() => undefined);

  if (!wasConnected) {
    scheduleAppleHealthStepsRepair({
      trigger: "connection",
      bypassCooldown: true,
      getIdToken: args.getIdToken,
      ...(args.userUid ? { userUid: args.userUid } : {}),
    });
  }

  return { ok: true, alreadyConnected: wasConnected };
}
