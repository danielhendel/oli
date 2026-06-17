import {
  buildEditedNutritionPayload,
  formatTimeOfDay,
  parseTimeOfDayInput,
  timeFieldsFromIso,
  timeFieldsFromWheel,
  timeOfDayToIsoOnDay,
  timeWheelFromFields,
} from "@/lib/nutrition/editNutritionLog";
import type { ManualNutritionPayload } from "@/lib/events/manualNutrition";

const base: ManualNutritionPayload = {
  start: "2026-03-15T17:22:00.000Z",
  end: "2026-03-15T17:22:01.000Z",
  timezone: "America/New_York",
  day: "2026-03-15",
  totalKcal: 220,
  proteinG: 5,
  carbsG: 43,
  fatG: 2.5,
  logScope: "meal",
  foodLabel: "Jasmine Rice",
  mealSlot: "lunch",
};

describe("parseTimeOfDayInput", () => {
  it("parses 12h with meridiem", () => {
    expect(parseTimeOfDayInput("2:22 PM")).toEqual({ hours24: 14, minutes: 22 });
    expect(parseTimeOfDayInput("12:00 AM")).toEqual({ hours24: 0, minutes: 0 });
    expect(parseTimeOfDayInput("12:30 pm")).toEqual({ hours24: 12, minutes: 30 });
    expect(parseTimeOfDayInput("7:05am")).toEqual({ hours24: 7, minutes: 5 });
  });

  it("parses 24h without meridiem", () => {
    expect(parseTimeOfDayInput("14:22")).toEqual({ hours24: 14, minutes: 22 });
    expect(parseTimeOfDayInput("00:00")).toEqual({ hours24: 0, minutes: 0 });
  });

  it("rejects invalid input", () => {
    expect(parseTimeOfDayInput("")).toBeNull();
    expect(parseTimeOfDayInput("25:00")).toBeNull();
    expect(parseTimeOfDayInput("2:99 PM")).toBeNull();
    expect(parseTimeOfDayInput("13:00 PM")).toBeNull();
    expect(parseTimeOfDayInput("noon")).toBeNull();
  });
});

describe("formatTimeOfDay", () => {
  it("formats to 12h clock", () => {
    expect(formatTimeOfDay(14, 22)).toBe("2:22 PM");
    expect(formatTimeOfDay(0, 0)).toBe("12:00 AM");
    expect(formatTimeOfDay(12, 5)).toBe("12:05 PM");
  });
});

describe("timeOfDayToIsoOnDay / timeFieldsFromIso round-trip", () => {
  it("preserves local hour/minute", () => {
    const iso = timeOfDayToIsoOnDay("2026-03-15", 14, 22);
    expect(timeFieldsFromIso(iso)).toEqual({ hours24: 14, minutes: 22 });
  });
});

describe("timeWheelFromFields / timeFieldsFromWheel", () => {
  it("round-trips 12h wheel values", () => {
    expect(timeWheelFromFields(21, 5)).toEqual({ hour12: 9, minute: 5, meridiem: "PM" });
    const back = timeFieldsFromWheel({ hour12: 9, minute: 5, meridiem: "PM" });
    expect(back).toEqual({ hours24: 21, minutes: 5 });
    expect(formatTimeOfDay(back.hours24, back.minutes)).toBe("9:05 PM");
  });

  it("handles midnight and noon", () => {
    expect(timeWheelFromFields(0, 0)).toEqual({ hour12: 12, minute: 0, meridiem: "AM" });
    expect(timeWheelFromFields(12, 30)).toEqual({ hour12: 12, minute: 30, meridiem: "PM" });
  });
});

describe("buildEditedNutritionPayload", () => {
  it("preserves macros and updates window + numbered meal slot", () => {
    const next = buildEditedNutritionPayload(base, {
      observedAtIso: "2026-03-15T19:00:00.000Z",
      mealSlot: "meal3",
    });
    expect(next.totalKcal).toBe(220);
    expect(next.proteinG).toBe(5);
    expect(next.carbsG).toBe(43);
    expect(next.fatG).toBe(2.5);
    expect(next.day).toBe("2026-03-15");
    expect(next.start).toBe("2026-03-15T19:00:00.000Z");
    expect(next.end).toBe("2026-03-15T19:00:01.000Z");
    expect(next.mealSlot).toBe("meal3");
    expect(next.foodLabel).toBe("Jasmine Rice");
  });

  it("preserves macros and updates window + legacy slot", () => {
    const next = buildEditedNutritionPayload(base, {
      observedAtIso: "2026-03-15T19:00:00.000Z",
      mealSlot: "dinner",
    });
    expect(next.totalKcal).toBe(220);
    expect(next.mealSlot).toBe("dinner");
  });

  it("keeps original window when observedAt invalid", () => {
    const next = buildEditedNutritionPayload(base, { observedAtIso: "not-a-date" });
    expect(next.start).toBe(base.start);
    expect(next.end).toBe(base.end);
    expect(next.mealSlot).toBe("lunch");
  });
});
