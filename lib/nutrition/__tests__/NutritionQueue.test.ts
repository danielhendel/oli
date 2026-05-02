import AsyncStorage from "@react-native-async-storage/async-storage";
import type { ManualNutritionPayload } from "@/lib/events/manualNutrition";
import { NutritionQueue } from "../NutritionQueue";
import { trackedMealNutritionIdempotencyKey } from "../trackedMealNutritionPayload";
import * as usersMe from "@/lib/api/usersMe";

jest.mock("@/lib/api/usersMe", () => ({
  logTrackedMealNutrition: jest.fn(),
}));

const payload: ManualNutritionPayload = {
  start: "2026-04-30T12:00:00.000Z",
  end: "2026-04-30T12:00:01.000Z",
  timezone: "UTC",
  day: "2026-04-30",
  totalKcal: 165,
  proteinG: 31,
  carbsG: 0,
  fatG: 3.6,
  logScope: "meal",
  nutritionIngestSource: "search",
  externalFoodId: "dev_chicken_breast_100g",
  foodHash: "hash_chicken",
};

describe("NutritionQueue", () => {
  const logTrackedMealNutrition = usersMe.logTrackedMealNutrition as jest.MockedFunction<
    typeof usersMe.logTrackedMealNutrition
  >;

  beforeEach(async () => {
    jest.clearAllMocks();
    await AsyncStorage.clear();
  });

  it("flushes queued nutrition items through logTrackedMealNutrition and clears queue on success", async () => {
    logTrackedMealNutrition.mockResolvedValue({
      ok: true,
      status: 202,
      requestId: "rid-ok",
      json: { ok: true, rawEventId: "re-1" },
    });

    await NutritionQueue.enqueue(payload);
    const result = await NutritionQueue.flush(async () => "token-1");

    expect(result).toEqual({ flushed: 1, failed: 0 });
    expect(logTrackedMealNutrition).toHaveBeenCalledTimes(1);
    expect(logTrackedMealNutrition).toHaveBeenCalledWith(payload, "token-1");
    expect(await NutritionQueue.pendingCount()).toBe(0);
  });

  it("keeps failed item queued and preserves idempotency key across retry", async () => {
    const expectedKey = trackedMealNutritionIdempotencyKey(payload);
    logTrackedMealNutrition.mockResolvedValue({
      ok: false,
      status: 0,
      kind: "network",
      error: "offline",
      requestId: null,
    });

    await NutritionQueue.enqueue(payload);
    const result = await NutritionQueue.flush(async () => "token-1");

    expect(result).toEqual({ flushed: 0, failed: 1 });
    expect(await NutritionQueue.pendingCount()).toBe(1);
    const stored = await AsyncStorage.getItem("oli_nutrition_ingest_queue_v1");
    expect(stored).toBeTruthy();
    const items = JSON.parse(stored ?? "[]") as { idempotencyKey: string; attempts: number }[];
    expect(items).toHaveLength(1);
    expect(items[0]?.idempotencyKey).toBe(expectedKey);
    expect(items[0]?.attempts).toBe(1);
  });
});
