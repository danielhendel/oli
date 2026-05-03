import {
  strengthWeeklyFrequencyActivityTierIndexForTierBand,
  strengthWeeklyFrequencyDisplayScaleFill01,
  strengthWeeklyFrequencyRatingLabelFromTierBand,
  strengthWeeklyFrequencyTierBandFromAvg,
  strengthWeeklyFrequencyTierBandRangeLabel,
} from "../strengthWeeklyFrequencyRating";

describe("strengthWeeklyFrequencyRating", () => {
  it("maps tier bands to required frequency labels (no subjective Optimal vocabulary)", () => {
    expect(strengthWeeklyFrequencyRatingLabelFromTierBand(0)).toBe("Very Low");
    expect(strengthWeeklyFrequencyRatingLabelFromTierBand(1)).toBe("Low");
    expect(strengthWeeklyFrequencyRatingLabelFromTierBand(2)).toBe("Moderate");
    expect(strengthWeeklyFrequencyRatingLabelFromTierBand(3)).toBe("High");
    expect(strengthWeeklyFrequencyRatingLabelFromTierBand(4)).toBe("Very High");
    expect(strengthWeeklyFrequencyRatingLabelFromTierBand(5)).toBe("Peak Frequency");
  });

  it("classifies averages into half-open bands on 0→7 display scale", () => {
    expect(strengthWeeklyFrequencyTierBandFromAvg(0.4)).toBe(0);
    expect(strengthWeeklyFrequencyTierBandFromAvg(1)).toBe(1);
    expect(strengthWeeklyFrequencyTierBandFromAvg(3.99)).toBe(3);
    expect(strengthWeeklyFrequencyTierBandFromAvg(4)).toBe(4);
    expect(strengthWeeklyFrequencyTierBandFromAvg(4.5)).toBe(4);
    expect(strengthWeeklyFrequencyTierBandFromAvg(5)).toBe(5);
    expect(strengthWeeklyFrequencyTierBandFromAvg(8.9)).toBe(5);
    expect(strengthWeeklyFrequencyTierBandFromAvg(-1)).toBe(0);
  });

  it("uses tier band as Activity bar palette index (single mapping)", () => {
    for (let b = 0; b <= 5; b++) {
      expect(strengthWeeklyFrequencyActivityTierIndexForTierBand(b)).toBe(b);
    }
  });

  it("exposes legend range captions aligned with tier boundaries", () => {
    expect(strengthWeeklyFrequencyTierBandRangeLabel(4)).toBe("4–5");
    expect(strengthWeeklyFrequencyTierBandRangeLabel(5)).toBe("5–7");
  });

  it("keeps fill linear on 0→7 without changing tier classification", () => {
    expect(strengthWeeklyFrequencyDisplayScaleFill01(4.5)).toBeCloseTo(4.5 / 7, 10);
    expect(strengthWeeklyFrequencyDisplayScaleFill01(5)).toBeCloseTo(5 / 7, 10);
  });
});
