import {
  OURA_SLEEP_DAY_REFRESH_API_PATH,
  postOuraSleepDayRefresh,
} from "@/lib/api/ouraSleepDayRefresh";

const mockApiPostZodAuthed = jest.fn();

jest.mock("@/lib/api/validate", () => ({
  apiPostZodAuthed: (...args: unknown[]) => mockApiPostZodAuthed(...args),
}));

describe("postOuraSleepDayRefresh", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockApiPostZodAuthed.mockResolvedValue({
      ok: true,
      status: 200,
      requestId: "r1",
      json: { ok: true, requestId: "r1", day: "2026-05-24", pullNowStatus: 202 },
    });
  });

  it("calls the exact gateway-deployed path", async () => {
    await postOuraSleepDayRefresh("tok", { day: "2026-05-24" }, { idempotencyKey: "idem-1" });
    expect(mockApiPostZodAuthed).toHaveBeenCalledTimes(1);
    expect(mockApiPostZodAuthed.mock.calls[0]?.[0]).toBe(OURA_SLEEP_DAY_REFRESH_API_PATH);
  });
});
