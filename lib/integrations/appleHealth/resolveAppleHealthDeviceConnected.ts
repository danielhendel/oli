/**
 * Apple Health row status: connected if the server has ingested apple_health raw events,
 * or (iOS) HealthKit body-composition read access is authorized — aligns list + detail with
 * real permission when the API query lags or only non-body apple_health rows exist.
 */

import { Platform } from "react-native";
import { getBodyCompositionReadAuthStatus } from "@/lib/integrations/appleHealth";
import { mapReadStatusesToSnapshot } from "@/lib/data/body/appleHealthBodyUxPhase";

export async function resolveAppleHealthDeviceConnected(apiConnected: boolean): Promise<boolean> {
  if (apiConnected) return true;
  if (Platform.OS !== "ios") return false;
  try {
    const r = await getBodyCompositionReadAuthStatus();
    if (!r.ok) return false;
    return mapReadStatusesToSnapshot(r.readStatuses).kind === "authorized";
  } catch {
    return false;
  }
}
