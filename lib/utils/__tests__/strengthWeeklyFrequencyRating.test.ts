import {
  strengthWeeklyFrequencyRatingBucketFromAvg,
  strengthWeeklyFrequencyRatingLabelFromBucket,
} from "../strengthWeeklyFrequencyRating";

describe("strengthWeeklyFrequencyRating", () => {
  it("maps buckets to required frequency labels (no subjective Strength/Optimal vocabulary)", () => {
    expect(strengthWeeklyFrequencyRatingLabelFromBucket(0)).toBe("None");
    expect(strengthWeeklyFrequencyRatingLabelFromBucket(1)).toBe("Very Low");
    expect(strengthWeeklyFrequencyRatingLabelFromBucket(2)).toBe("Low");
    expect(strengthWeeklyFrequencyRatingLabelFromBucket(3)).toBe("Moderate");
    expect(strengthWeeklyFrequencyRatingLabelFromBucket(4)).toBe("High");
    expect(strengthWeeklyFrequencyRatingLabelFromBucket(5)).toBe("Very High");
    expect(strengthWeeklyFrequencyRatingLabelFromBucket(6)).toBe("Very High");
    expect(strengthWeeklyFrequencyRatingLabelFromBucket(7)).toBe("Max Frequency");
  });

  it("rounds averages into 0–7 buckets", () => {
    expect(strengthWeeklyFrequencyRatingBucketFromAvg(3.4)).toBe(3);
    expect(strengthWeeklyFrequencyRatingBucketFromAvg(3.5)).toBe(4);
    expect(strengthWeeklyFrequencyRatingBucketFromAvg(8.9)).toBe(7);
    expect(strengthWeeklyFrequencyRatingBucketFromAvg(-1)).toBe(0);
  });
});
