import type { SleepViewDto } from "@oli/contracts";
import { pickVendorSleepScoreForAnchorDay } from "../pickVendorSleepScoreForAnchorDay";

const day = "2026-05-01";

function sleepView(
  over: Partial<SleepViewDto> & Pick<SleepViewDto, "requestedDay" | "resolvedDay" | "day">,
): SleepViewDto {
  return {
    isFallback: false,
    contributors: {},
    ...over,
  } as SleepViewDto;
}

describe("pickVendorSleepScoreForAnchorDay", () => {
  it("returns score when view is exact-day and not fallback", () => {
    expect(
      pickVendorSleepScoreForAnchorDay(
        sleepView({
          requestedDay: day,
          resolvedDay: day,
          day,
          score: 96,
        }),
        day,
      ),
    ).toBe(96);
  });

  it("returns null when isFallback (vendor row not for requested calendar day)", () => {
    expect(
      pickVendorSleepScoreForAnchorDay(
        sleepView({
          requestedDay: day,
          resolvedDay: "2026-04-30",
          day: "2026-04-30",
          score: 99,
          isFallback: true,
        }),
        day,
      ),
    ).toBeNull();
  });

  it("returns null when requested/resolved days do not match anchor (trim-aware alignment)", () => {
    expect(
      pickVendorSleepScoreForAnchorDay(
        sleepView({
          requestedDay: day,
          resolvedDay: day,
          day,
          score: 88,
        }),
        "2026-05-02",
      ),
    ).toBeNull();
  });

  it("returns null when score is absent", () => {
    expect(
      pickVendorSleepScoreForAnchorDay(
        sleepView({
          requestedDay: day,
          resolvedDay: day,
          day,
        }),
        day,
      ),
    ).toBeNull();
  });
});
