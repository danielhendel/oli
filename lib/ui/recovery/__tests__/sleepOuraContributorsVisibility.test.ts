import type { SleepViewDto } from "@oli/contracts";

import { sleepOuraContributorsCardShouldRender } from "@/lib/ui/recovery/sleepOuraContributorsVisibility";
import type { ContributorRowProps } from "@/lib/ui/recovery/RecoveryContributorsCard";

describe("sleepOuraContributorsCardShouldRender", () => {
  const baseView: SleepViewDto = {
    requestedDay: "2026-04-06",
    resolvedDay: "2026-04-06",
    isFallback: false,
    day: "2026-04-06",
    score: 70,
    contributors: {},
  };

  it("returns false when API is in cross-day fallback", () => {
    expect(
      sleepOuraContributorsCardShouldRender(
        { ...baseView, isFallback: true, resolvedDay: "2026-04-05", day: "2026-04-05" },
        [],
      ),
    ).toBe(false);
  });

  it("returns false when all rows are placeholders", () => {
    const rows: ContributorRowProps[] = [
      { label: "Total sleep", valueDisplay: "—", progress: 0, rating: "Pay attention" },
    ];
    expect(sleepOuraContributorsCardShouldRender(baseView, rows)).toBe(false);
  });

  it("returns true when at least one row has a real value", () => {
    const rows: ContributorRowProps[] = [
      { label: "Total sleep", valueDisplay: "420", progress: 0.5, rating: "Good" },
    ];
    expect(sleepOuraContributorsCardShouldRender(baseView, rows)).toBe(true);
  });
});
