/**
 * Client-side guard before POST /ingest for Apple daily steps.
 * Uses last successful ingest per local day (AsyncStorage) as a stand-in for “existing canonical”
 * when HealthKit returns a lower total (e.g. transient partial read). Always allows hkEmpty → 0.
 */

export function shouldIngestAppleHealthStepsForDay(params: {
  healthSteps: number;
  hkEmpty?: boolean;
  lastIngestedSteps: number | null;
}): boolean {
  const { healthSteps, hkEmpty, lastIngestedSteps } = params;
  if (hkEmpty) return true;
  if (lastIngestedSteps == null) return true;
  if (healthSteps === 0) return true;
  return healthSteps >= lastIngestedSteps;
}
