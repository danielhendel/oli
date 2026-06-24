// lib/classifications/__tests__/classifyMetric.test.ts
import { classifyMetric } from "@/lib/classifications/classifyMetric";
import { BMI_METRIC, BODY_FAT_PERCENT_MALE } from "@/lib/classifications/bodyComposition";
import { DAILY_STEPS_METRIC } from "@/lib/classifications/activity";

describe("classifyMetric", () => {
  it("returns unavailable for missing values", () => {
    const result = classifyMetric(BMI_METRIC, null);
    expect(result.status).toBe("unavailable");
    if (result.status === "unavailable") {
      expect(result.reason).toBe("missing_value");
    }
  });

  it("classifies BMI level boundaries", () => {
    expect(classifyMetric(BMI_METRIC, 36).status).toBe("classified");
    expect(classifyMetric(BMI_METRIC, 36)).toMatchObject({ status: "classified", level: 1 });

    expect(classifyMetric(BMI_METRIC, 32)).toMatchObject({ status: "classified", level: 2 });
    expect(classifyMetric(BMI_METRIC, 27)).toMatchObject({ status: "classified", level: 3 });
    expect(classifyMetric(BMI_METRIC, 23)).toMatchObject({ status: "classified", level: 4 });
    expect(classifyMetric(BMI_METRIC, 21)).toMatchObject({ status: "classified", level: 5 });
  });

  it("classifies body fat men optimal range", () => {
    expect(classifyMetric(BODY_FAT_PERCENT_MALE, 10)).toMatchObject({
      status: "classified",
      level: 5,
    });
    expect(classifyMetric(BODY_FAT_PERCENT_MALE, 32)).toMatchObject({
      status: "classified",
      level: 1,
    });
  });

  it("classifies daily steps level 5 above 12000", () => {
    expect(classifyMetric(DAILY_STEPS_METRIC, 13000)).toMatchObject({
      status: "classified",
      level: 5,
    });
    expect(classifyMetric(DAILY_STEPS_METRIC, 3000)).toMatchObject({
      status: "classified",
      level: 1,
    });
  });

  it("is deterministic", () => {
    const a = classifyMetric(BMI_METRIC, 24);
    const b = classifyMetric(BMI_METRIC, 24);
    expect(a).toEqual(b);
  });

  it("includes version on every result", () => {
    const classified = classifyMetric(BMI_METRIC, 22);
    const unavailable = classifyMetric(BMI_METRIC, null);
    expect(classified).toMatchObject({ version: "1.0" });
    expect(unavailable).toMatchObject({ version: "1.0" });
  });
});
