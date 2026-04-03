import type { AppleHealthBodyBackfillState } from "@/lib/integrations/appleHealth/storage";

/**
 * Whether prior successful Apple Health body pipeline activity was persisted locally.
 * Used for stale-while-revalidate UX (avoid connect/sync flicker on warm load).
 */
export function bodyAppleHealthPersistedPipelineEvidence(input: {
  appleHealthConnected: boolean;
  bodyLastCheckedAt: string | null;
  backfill: AppleHealthBodyBackfillState | null;
}): boolean {
  if (input.appleHealthConnected) return true;
  if (input.bodyLastCheckedAt != null && input.bodyLastCheckedAt.length > 0) return true;
  return input.backfill?.status === "completed";
}
