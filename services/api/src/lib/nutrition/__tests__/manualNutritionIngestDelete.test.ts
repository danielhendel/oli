import { localCalendarDayKeyFromIsoInTimeZone } from "@oli/contracts";

import { userCollection } from "../../../db";
import { getRecomputeDerivedTruthForDay } from "../../loadRecomputeDerivedTruthForDay";
import {
  deleteDerivedNutritionForManualRawEvent,
  finalizeManualNutritionIngestDelete,
  nutritionDayKeyFromManualPayload,
} from "../manualNutritionIngestDelete";

jest.mock("../../../db", () => ({
  db: {},
  userCollection: jest.fn(),
}));

jest.mock("../../loadRecomputeDerivedTruthForDay", () => ({
  getRecomputeDerivedTruthForDay: jest.fn(),
}));

const manualPayload = {
  start: "2026-03-15T18:22:00.000Z",
  end: "2026-03-15T18:22:01.000Z",
  timezone: "America/New_York",
  day: "2026-03-15",
  totalKcal: 220,
  proteinG: 5,
  carbsG: 43,
  fatG: 2.5,
};

describe("nutritionDayKeyFromManualPayload", () => {
  test("prefers explicit payload.day when present", () => {
    expect(nutritionDayKeyFromManualPayload(manualPayload)).toBe("2026-03-15");
  });

  test("falls back to start + timezone when day is absent", () => {
    const withoutDay = {
      start: manualPayload.start,
      end: manualPayload.end,
      timezone: manualPayload.timezone,
      totalKcal: manualPayload.totalKcal,
      proteinG: manualPayload.proteinG,
      carbsG: manualPayload.carbsG,
      fatG: manualPayload.fatG,
    };
    expect(nutritionDayKeyFromManualPayload(withoutDay)).toBe(
      localCalendarDayKeyFromIsoInTimeZone(withoutDay.start, withoutDay.timezone),
    );
  });
});

describe("deleteDerivedNutritionForManualRawEvent", () => {
  beforeEach(() => {
    jest.resetAllMocks();
  });

  test("deletes canonical nutrition event linked to raw id", async () => {
    const deleteMock = jest.fn(async () => undefined);
    (userCollection as jest.Mock).mockReturnValue({
      doc: () => ({
        get: async () =>
          ({
            exists: true,
            data: () => ({ kind: "nutrition", id: "nm_meal_1" }),
          }) as const,
        delete: deleteMock,
      }),
    });

    const result = await deleteDerivedNutritionForManualRawEvent({
      userId: "user_123",
      rawEventId: "nm_meal_1",
    });

    expect(userCollection).toHaveBeenCalledWith("user_123", "events");
    expect(deleteMock).toHaveBeenCalledTimes(1);
    expect(result.canonicalDeleted).toBe(true);
  });

  test("skips delete when canonical doc is missing or not nutrition", async () => {
    const deleteMock = jest.fn(async () => undefined);
    (userCollection as jest.Mock).mockReturnValue({
      doc: () => ({
        get: async () =>
          ({
            exists: true,
            data: () => ({ kind: "workout", id: "nm_meal_1" }),
          }) as const,
        delete: deleteMock,
      }),
    });

    const result = await deleteDerivedNutritionForManualRawEvent({
      userId: "user_123",
      rawEventId: "nm_meal_1",
    });

    expect(deleteMock).not.toHaveBeenCalled();
    expect(result.canonicalDeleted).toBe(false);
  });
});

describe("finalizeManualNutritionIngestDelete", () => {
  beforeEach(() => {
    jest.resetAllMocks();
  });

  test("removes canonical nutrition and recomputes DailyFacts for the day", async () => {
    const deleteMock = jest.fn(async () => undefined);
    const recomputeMock = jest.fn(async () => undefined);
    (userCollection as jest.Mock).mockReturnValue({
      doc: () => ({
        get: async () =>
          ({
            exists: true,
            data: () => ({ kind: "nutrition", id: "nm_meal_1" }),
          }) as const,
        delete: deleteMock,
      }),
    });
    (getRecomputeDerivedTruthForDay as jest.Mock).mockReturnValue(recomputeMock);

    const result = await finalizeManualNutritionIngestDelete({
      userId: "user_123",
      rawEventId: "nm_meal_1",
      payload: manualPayload,
    });

    expect(result.dayKey).toBe("2026-03-15");
    expect(result.canonicalDeleted).toBe(true);
    expect(recomputeMock).toHaveBeenCalledWith({
      db: {},
      userId: "user_123",
      dayKey: "2026-03-15",
      trigger: { type: "realtime", eventId: "nm_meal_1" },
    });
  });
});
