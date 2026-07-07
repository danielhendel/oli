/**
 * Module-level serialization for Apple Health body sync so Dash + Body screens do not
 * run parallel HealthKit pulls and ingest loops.
 */

type BodySyncRunResult = { ok: boolean };

let inFlight: Promise<BodySyncRunResult> | null = null;

export async function runAppleHealthBodySyncSerialized(
  run: () => Promise<BodySyncRunResult>,
): Promise<BodySyncRunResult> {
  if (inFlight != null) return inFlight;
  inFlight = run().finally(() => {
    inFlight = null;
  });
  return inFlight;
}

/** Test-only reset. */
export function __testing_resetAppleHealthBodySyncCoordinator(): void {
  inFlight = null;
}
