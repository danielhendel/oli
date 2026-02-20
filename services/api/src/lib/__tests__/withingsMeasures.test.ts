/**
 * Phase 3B — withingsMeasures: deterministic idempotency, parser correctness.
 */

import {
  __resetWithingsTokenCacheForTests,
  fetchWithingsMeasures,
  WithingsMeasureError,
} from "../withingsMeasures";

const mockGetRefreshToken = jest.fn();
const mockGetClientSecret = jest.fn();

jest.mock("../withingsSecrets", () => ({
  getRefreshToken: (uid: string) => mockGetRefreshToken(uid),
  getClientSecret: () => mockGetClientSecret(),
}));

function makeTokenResponse() {
  return {
    status: 0,
    body: { access_token: "fake_access", expires_in: 3600 },
  };
}

function makeGetmeasResponse(measuregrps: {
  grpid?: number;
  date: number;
  measures: { type: number; unit: number; value: number }[];
}[]) {
  return { status: 0, body: { measuregrps } };
}

describe("withingsMeasures", () => {
  const uid = "user_abc";
  const startMs = 1000000000000;
  const endMs = 1000000000000 + 7200000;

  beforeEach(() => {
    __resetWithingsTokenCacheForTests();
    jest.clearAllMocks();
    jest.resetAllMocks();
    mockGetRefreshToken.mockResolvedValue("fake_refresh");
    mockGetClientSecret.mockResolvedValue("fake_secret");
    process.env.WITHINGS_CLIENT_ID = "test_client";
    (global as unknown as { fetch: jest.Mock }).fetch = jest.fn();
  });

  describe("deterministic idempotency key", () => {
    it("uses grpid when present: withings:weight:{uid}:{grpid}", async () => {
      const fetchMock = (global as unknown as { fetch: jest.Mock }).fetch;
      fetchMock
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          json: async () => makeTokenResponse(),
        })
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          json: async () =>
            makeGetmeasResponse([
              {
                grpid: 12345,
                date: 1700000000,
                measures: [{ type: 1, unit: -3, value: 75232 }],
              },
            ]),
        });

      const samples = await fetchWithingsMeasures(uid, startMs, endMs);
      expect(samples).toHaveLength(1);
      expect(samples[0].idempotencyKey).toBe("withings:weight:user_abc:12345");
      expect(samples[0].weightKg).toBeCloseTo(75.232);
      expect(samples[0].bodyFatPercent).toBeNull();
    });

    it("uses measuredAtIso:weightKg:bodyFat when grpid absent", async () => {
      const fetchMock = (global as unknown as { fetch: jest.Mock }).fetch;
      const dateUnix = 1700000000;
      fetchMock
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          json: async () => makeTokenResponse(),
        })
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          json: async () =>
            makeGetmeasResponse([
              {
                date: dateUnix,
                measures: [
                  { type: 1, unit: -3, value: 70000 },
                  { type: 6, unit: 0, value: 22 },
                ],
              },
            ]),
        });

      const samples = await fetchWithingsMeasures(uid, startMs, endMs);
      expect(samples).toHaveLength(1);
      const expectedIso = new Date(dateUnix * 1000).toISOString();
      const weightFixed = (70).toFixed(3);
      const bfFixed = (22).toFixed(2);
      expect(samples[0].idempotencyKey).toBe(
        `withings:weight:user_abc:${expectedIso}:${weightFixed}:${bfFixed}`,
      );
      expect(samples[0].weightKg).toBe(70);
      expect(samples[0].bodyFatPercent).toBe(22);
    });

    it("same API response produces same idempotency keys on two calls", async () => {
      const fetchMock = (global as unknown as { fetch: jest.Mock }).fetch;
      const payload = makeGetmeasResponse([
        { grpid: 999, date: 1700000100, measures: [{ type: 1, unit: -3, value: 80000 }] },
      ]);
      const tokenRes = { ok: true, status: 200, json: async () => makeTokenResponse() };
      const measureRes = { ok: true, status: 200, json: async () => payload };
      fetchMock
        .mockResolvedValueOnce(tokenRes)
        .mockResolvedValueOnce(measureRes)
        .mockResolvedValueOnce(tokenRes)
        .mockResolvedValueOnce(measureRes);

      const s1 = await fetchWithingsMeasures(uid, startMs, endMs);
      __resetWithingsTokenCacheForTests();
      const s2 = await fetchWithingsMeasures(uid, startMs, endMs);
      expect(s1[0].idempotencyKey).toBe(s2[0].idempotencyKey);
      expect(s1[0].idempotencyKey).toBe("withings:weight:user_abc:999");
    });
  });

  describe("parser correctness", () => {
    it("parses weight (type 1) with unit -3 as kg", async () => {
      const fetchMock = (global as unknown as { fetch: jest.Mock }).fetch;
      fetchMock
        .mockResolvedValueOnce({ ok: true, status: 200, json: async () => makeTokenResponse() })
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          json: async () =>
            makeGetmeasResponse([
              {
                grpid: 1,
                date: 1700000000,
                measures: [{ type: 1, unit: -3, value: 75232 }],
              },
            ]),
        });

      const samples = await fetchWithingsMeasures(uid, startMs, endMs);
      expect(samples[0].weightKg).toBeCloseTo(75.232);
      expect(samples[0].bodyFatPercent).toBeNull();
    });

    it("parses fat ratio (type 6) 0-100 as bodyFatPercent", async () => {
      const fetchMock = (global as unknown as { fetch: jest.Mock }).fetch;
      fetchMock
        .mockResolvedValueOnce({ ok: true, status: 200, json: async () => makeTokenResponse() })
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          json: async () =>
            makeGetmeasResponse([
              {
                grpid: 2,
                date: 1700000000,
                measures: [
                  { type: 1, unit: -3, value: 70000 },
                  { type: 6, unit: 0, value: 18 },
                ],
              },
            ]),
        });

      const samples = await fetchWithingsMeasures(uid, startMs, endMs);
      expect(samples[0].bodyFatPercent).toBe(18);
    });

    it("skips groups without valid weight", async () => {
      const fetchMock = (global as unknown as { fetch: jest.Mock }).fetch;
      fetchMock
        .mockResolvedValueOnce({ ok: true, status: 200, json: async () => makeTokenResponse() })
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          json: async () =>
            makeGetmeasResponse([
              { grpid: 1, date: 1700000000, measures: [{ type: 6, unit: 0, value: 20 }] },
            ]),
        });

      const samples = await fetchWithingsMeasures(uid, startMs, endMs);
      expect(samples).toHaveLength(0);
    });
  });

  describe("fail-closed", () => {
    it("throws WithingsMeasureError when refresh token missing", async () => {
      mockGetRefreshToken.mockResolvedValue(null);
      await expect(fetchWithingsMeasures(uid, startMs, endMs)).rejects.toThrow(WithingsMeasureError);
      __resetWithingsTokenCacheForTests();
      await expect(fetchWithingsMeasures(uid, startMs, endMs)).rejects.toMatchObject({
        code: "WITHINGS_REFRESH_TOKEN_MISSING",
      });
    });

    it("throws WithingsMeasureError when getmeas API returns error", async () => {
      const fetchMock = (global as unknown as { fetch: jest.Mock }).fetch;
      fetchMock
        .mockResolvedValueOnce({ ok: true, status: 200, json: async () => makeTokenResponse() })
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          json: async () => ({ status: 501, body: { error: "Service unavailable" } }),
        });

      const err = await fetchWithingsMeasures(uid, startMs, endMs).then(
        () => null,
        (e: unknown) => e,
      );
      expect(err).toBeInstanceOf(WithingsMeasureError);
      expect((err as WithingsMeasureError).code).toBe("WITHINGS_MEASURE_API_ERROR");
    });
  });
});
