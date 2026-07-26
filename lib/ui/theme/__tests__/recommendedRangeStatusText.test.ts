import { describe, expect, it } from "@jest/globals";

import {
  sleepDurationReferenceStatusTextColor,
  UI_DURATION_STATUS_ABOVE_TYPICAL_TEXT,
  UI_DURATION_STATUS_BELOW_TYPICAL_TEXT,
  UI_DURATION_STATUS_RECOMMENDED_TEXT,
} from "@/lib/ui/theme/recommendedRangeChrome";
import { DASH_MONITOR_RATING_TONE_CHROME_DARK } from "@/lib/ui/theme/dashMonitorRatingToneChrome";
import { OLI_DARK } from "@/lib/ui/theme/oliSemantic";

describe("sleepDurationReferenceStatusTextColor", () => {
  it("maps Recommended to Monitor positive green", () => {
    expect(sleepDurationReferenceStatusTextColor("Recommended")).toBe(
      DASH_MONITOR_RATING_TONE_CHROME_DARK.positive.foreground,
    );
    expect(UI_DURATION_STATUS_RECOMMENDED_TEXT).toBe(
      DASH_MONITOR_RATING_TONE_CHROME_DARK.positive.foreground,
    );
  });

  it("maps Below Typical to Monitor caution amber", () => {
    expect(sleepDurationReferenceStatusTextColor("Below Typical")).toBe(
      DASH_MONITOR_RATING_TONE_CHROME_DARK.caution.foreground,
    );
    expect(UI_DURATION_STATUS_BELOW_TYPICAL_TEXT).toBe(
      DASH_MONITOR_RATING_TONE_CHROME_DARK.caution.foreground,
    );
  });

  it("maps Above Typical to neutral secondary (not green, not critical red)", () => {
    expect(sleepDurationReferenceStatusTextColor("Above Typical")).toBe(OLI_DARK.textSecondary);
    expect(UI_DURATION_STATUS_ABOVE_TYPICAL_TEXT).toBe(OLI_DARK.textSecondary);
    expect(sleepDurationReferenceStatusTextColor("Above Typical")).not.toBe(
      UI_DURATION_STATUS_RECOMMENDED_TEXT,
    );
  });
});
