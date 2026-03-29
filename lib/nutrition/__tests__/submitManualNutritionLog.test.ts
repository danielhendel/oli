import * as usersMe from "@/lib/api/usersMe";
import { submitManualNutritionLog } from "../submitManualNutritionLog";

jest.mock("@/lib/api/usersMe", () => ({
  logNutrition: jest.fn(),
}));

describe("submitManualNutritionLog", () => {
  const logNutrition = usersMe.logNutrition as jest.MockedFunction<typeof usersMe.logNutrition>;

  beforeEach(() => {
    logNutrition.mockReset();
    logNutrition.mockResolvedValue({
      ok: true,
      status: 202,
      requestId: "rid-1",
      json: { ok: true as const, rawEventId: "re-1" },
    });
  });

  it("calls logNutrition with built payload and token", async () => {
    const res = await submitManualNutritionLog({
      idToken: "tok",
      dayKey: "2026-01-10",
      timeZone: "UTC",
      values: {
        totalKcal: 2000,
        proteinG: 100,
        carbsG: 200,
        fatG: 60,
        fiberG: null,
      },
    });

    expect(res.ok).toBe(true);
    expect(logNutrition).toHaveBeenCalledTimes(1);
    const [payload, token] = logNutrition.mock.calls[0]!;
    expect(token).toBe("tok");
    expect(payload.timezone).toBe("UTC");
    expect(payload.totalKcal).toBe(2000);
    expect(payload.proteinG).toBe(100);
    expect(payload.day).toBe("2026-01-10");
  });
});
