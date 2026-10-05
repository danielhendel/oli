import { AS_OF, DAY_MS } from "../src/constants";
import { SCHEDULES, expectedEligibility, isoAt, scheduleById, scheduleTimestamps } from "../src/schedules";
import { bcv016Rows } from "../src/protocols/bcv016";

describe("schedule catalog S-01…S-15", () => {
  it("has exactly 15 schedules in order", () => {
    expect(SCHEDULES.map((s) => s.id)).toEqual(Array.from({ length: 15 }, (_, i) => `S-${String(i + 1).padStart(2, "0")}`));
  });
  it("exact boundary timestamps", () => {
    const asOf = Date.parse(AS_OF);
    expect(Date.parse(scheduleTimestamps(scheduleById("S-04")).dxaAt)).toBe(asOf - 90 * DAY_MS);
    expect(Date.parse(scheduleTimestamps(scheduleById("S-05")).dxaAt)).toBe(asOf - 90 * DAY_MS - 1);
    expect(Date.parse(scheduleTimestamps(scheduleById("S-08")).waistAt)).toBe(asOf - 180 * DAY_MS);
    expect(Date.parse(scheduleTimestamps(scheduleById("S-09")).waistAt)).toBe(asOf - 180 * DAY_MS - 1);
    expect(isoAt(0)).toBe(AS_OF);
  });
  it("S-14 shares a scan id, S-15 uses distinct event ids at the same timestamp", () => {
    const s14 = scheduleById("S-14");
    expect(s14.dxaSourceEventId).toBe("scan-A");
    expect(s14.waistSourceEventId).not.toBe(s14.dxaSourceEventId);
    const s15 = scheduleById("S-15");
    const t = scheduleTimestamps(s15);
    expect(t.waistAt).toBe(t.dxaAt);
    expect(s15.waistSourceEventId).toBe("w1");
    expect(s15.dxaSourceEventId).toBe("scan-B");
  });
  it("independent oracle: 180d / 90d boundaries are strict", () => {
    expect(expectedEligibility(scheduleById("S-04")).health.eligible).toBe(true); // 90d exactly
    expect(expectedEligibility(scheduleById("S-05")).health).toEqual({ eligible: false, reason: "evidence_era_mismatch" });
    expect(expectedEligibility(scheduleById("S-08")).health.eligible).toBe(false); // waist 180d vs others 0 → era gap
    expect(expectedEligibility(scheduleById("S-13")).performance).toEqual({ eligible: false, reason: "evidence_too_old" });
    expect(expectedEligibility(scheduleById("S-11")).performance.eligible).toBe(true);
  });
});

describe("BCV-016 engine vs oracle", () => {
  const rows = bcv016Rows();
  it("every schedule matches the independent freeze-rule oracle", () => {
    expect(rows).toHaveLength(15);
    for (const r of rows) expect({ id: r.scheduleId, pass: r.structuralPass }).toEqual({ id: r.scheduleId, pass: true });
  });
  it("S-01 is fully eligible; S-13 withholds both on age", () => {
    expect(rows[0]!.health.eligible).toBe(true);
    expect(rows[0]!.performance.eligible).toBe(true);
    const s13 = rows.find((r) => r.scheduleId === "S-13")!;
    expect(s13.health.primaryReason).toBe("evidence_too_old");
    expect(s13.performance.primaryReason).toBe("evidence_too_old");
  });
});
