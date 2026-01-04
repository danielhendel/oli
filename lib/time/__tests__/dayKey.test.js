const { ymdInTimeZoneFromIso } = require("../dayKey");

describe("ymdInTimeZoneFromIso()", () => {
  test("derives local day for America/New_York around midnight", () => {
    // 2025-01-02T04:30Z == 2025-01-01 23:30 in New York (EST)
    const iso = "2025-01-02T04:30:00.000Z";
    expect(ymdInTimeZoneFromIso(iso, "America/New_York")).toBe("2025-01-01");
  });

  test("falls back to UTC if timezone invalid", () => {
    const iso = "2025-01-02T04:30:00.000Z";
    expect(ymdInTimeZoneFromIso(iso, "Not/A_Timezone")).toBe("2025-01-02");
  });
});
