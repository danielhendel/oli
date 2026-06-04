import { describe, expect, it } from "@jest/globals";

import {
  compareOuraSleepPrimaryQuality,
  pickPrimaryOuraSleepDocument,
  pickPrimaryOuraSleepPairs,
} from "../pickPrimaryOuraSleepForAnchorDay";
import type { OuraSleepWindowDocument } from "../resolveOuraSleepIngestBase";

/** Regression: Spain travel week — Oura 8h17m long_sleep must beat 4m afternoon `sleep` on same day. */
const JUNE_3_LONG_SLEEP: OuraSleepWindowDocument = {
  id: "5b307cdc-7242-429c-ac94-c38c8308b7ff",
  day: "2026-06-03",
  type: "long_sleep",
  bedtime_start: "2026-06-03T00:21:57.000+02:00",
  bedtime_end: "2026-06-03T09:17:04.000+02:00",
  total_sleep_duration: 497 * 60,
  score: 87,
};

const JUNE_3_SHORT_NAP: OuraSleepWindowDocument = {
  id: "5dd8464e-bd06-4452-be71-d7c825b40ac1",
  day: "2026-06-03",
  type: "sleep",
  bedtime_start: "2026-06-03T16:01:57.000-04:00",
  bedtime_end: "2026-06-03T16:25:28.000-04:00",
  total_sleep_duration: 4 * 60,
};

describe("pickPrimaryOuraSleepForAnchorDay", () => {
  it("prefers long_sleep over shorter sleep periods on the same Oura day", () => {
    expect(compareOuraSleepPrimaryQuality(JUNE_3_LONG_SLEEP, JUNE_3_SHORT_NAP)).toBeGreaterThan(0);
    expect(pickPrimaryOuraSleepDocument([JUNE_3_SHORT_NAP, JUNE_3_LONG_SLEEP])?.id).toBe(
      JUNE_3_LONG_SLEEP.id,
    );
  });

  it("pickPrimaryOuraSleepPairs returns one winner per anchor day", () => {
    const pairs = [
      { doc: JUNE_3_SHORT_NAP, snapshot: { id: JUNE_3_SHORT_NAP.id!, day: "2026-06-03" } },
      { doc: JUNE_3_LONG_SLEEP, snapshot: { id: JUNE_3_LONG_SLEEP.id!, day: "2026-06-03" } },
      {
        doc: {
          id: "6709479c-cddd-4d76-8495-213b6f659ae6",
          day: "2026-06-04",
          type: "long_sleep",
          bedtime_start: "2026-06-04T00:20:00.000-04:00",
          bedtime_end: "2026-06-04T07:23:41.000-04:00",
          total_sleep_duration: 404 * 60,
        },
        snapshot: { id: "6709479c-cddd-4d76-8495-213b6f659ae6", day: "2026-06-04" },
      },
    ];
    const winners = pickPrimaryOuraSleepPairs(pairs);
    expect(winners).toHaveLength(2);
    const june3 = winners.find((w) => w.snapshot.day === "2026-06-03");
    expect(june3?.snapshot.id).toBe(JUNE_3_LONG_SLEEP.id);
  });
});
