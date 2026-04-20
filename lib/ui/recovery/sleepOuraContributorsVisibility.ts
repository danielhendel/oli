import type { SleepViewDto } from "@oli/contracts";

import type { ContributorRowProps } from "@/lib/ui/recovery/RecoveryContributorsCard";

/**
 * Vendor contributor rows must not appear when the API fell back to another night,
 * or when there is no non-placeholder contributor data for the resolved night.
 */
export function sleepOuraContributorsCardShouldRender(
  view: SleepViewDto,
  contributorRows: ContributorRowProps[],
): boolean {
  if (view.isFallback) return false;
  return contributorRows.some((r) => r.valueDisplay !== "—");
}
