/**
 * Apple Health "connected" for this Oli account.
 *
 * Server ingest presence OR the explicit local account connection flag.
 * iOS HealthKit permission alone must NEVER imply account connection —
 * a new account on a device with prior HealthKit grant starts not connected
 * until the user taps Connect.
 */

import { getAppleHealthConnected } from "@/lib/integrations/appleHealth/storage";

export async function resolveAppleHealthDeviceConnected(apiConnected: boolean): Promise<boolean> {
  if (apiConnected) return true;
  return getAppleHealthConnected().catch(() => false);
}
