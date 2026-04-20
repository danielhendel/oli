import {
  buildSleepHeadlineScoreCardModelForOliPath,
  buildSleepHeadlineScoreCardModelForOuraFallbackPath,
} from "@/lib/data/sleep/sleepHeadlineScoreCardModel";
import { SLEEP_HEADLINE_FOOTNOTE_VENDOR, SLEEP_HEADLINE_VENDOR_SCORE_UNAVAILABLE } from "@/lib/format/sleepDisplay";

describe("buildSleepHeadlineScoreCardModelForOliPath", () => {
  it("shows vendor score and rating when snapshot has a score", () => {
    const m = buildSleepHeadlineScoreCardModelForOliPath(88);
    expect(m.score).toBe(88);
    expect(m.ratingLabel).toBe("Optimal");
    expect(m.scoreFootnote).toBe(SLEEP_HEADLINE_FOOTNOTE_VENDOR);
    expect(m.scoreUnavailableSubtitle).toBeNull();
    expect(m.source).toBe("vendor");
  });

  it("never uses Oli when vendor score is missing", () => {
    const m = buildSleepHeadlineScoreCardModelForOliPath(null);
    expect(m.score).toBeNull();
    expect(m.ratingLabel).toBeNull();
    expect(m.scoreFootnote).toBeNull();
    expect(m.scoreUnavailableSubtitle).toBe(SLEEP_HEADLINE_VENDOR_SCORE_UNAVAILABLE);
    expect(m.source).toBe("none");
  });
});

describe("buildSleepHeadlineScoreCardModelForOuraFallbackPath", () => {
  it("shows vendor score when present", () => {
    const m = buildSleepHeadlineScoreCardModelForOuraFallbackPath(72);
    expect(m.score).toBe(72);
    expect(m.source).toBe("vendor");
    expect(m.scoreFootnote).toBe(SLEEP_HEADLINE_FOOTNOTE_VENDOR);
  });

  it("unavailable when vendor score missing", () => {
    const m = buildSleepHeadlineScoreCardModelForOuraFallbackPath(null);
    expect(m.score).toBeNull();
    expect(m.scoreUnavailableSubtitle).toBe(SLEEP_HEADLINE_VENDOR_SCORE_UNAVAILABLE);
    expect(m.source).toBe("none");
  });
});
