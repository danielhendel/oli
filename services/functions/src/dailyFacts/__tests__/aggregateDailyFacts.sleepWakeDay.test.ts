/**
 * Documents that DailyFacts sleep rollups follow canonical `day` on each SleepCanonicalEvent
 * (recompute loads events with day === facts date).
 */
import { describe, it, expect } from "@jest/globals";
import { aggregateDailyFactsForDay } from "../aggregateDailyFacts";
import type { SleepCanonicalEvent } from "../../types/health";

describe("aggregateDailyFacts — sleep wake-day canonical events", () => {
  it("includes overnight sleep on the canonical wake / Oura sleep day", () => {
    const night: SleepCanonicalEvent = {
      id: "oura_n1",
      userId: "u1",
      sourceId: "oura",
      kind: "sleep",
      start: "2026-04-18T23:00:00.000Z",
      end: "2026-04-19T12:00:00.000Z",
      day: "2026-04-19",
      timezone: "UTC",
      createdAt: "2026-04-19T12:00:00.000Z",
      updatedAt: "2026-04-19T12:00:00.000Z",
      schemaVersion: 1,
      totalMinutes: 486,
      isMainSleep: true,
      efficiency: 0.94,
    };

    const facts = aggregateDailyFactsForDay({
      userId: "u1",
      date: "2026-04-19",
      computedAt: "2026-04-19T12:05:00.000Z",
      events: [night],
    });

    expect(facts.sleep?.totalMinutes).toBe(486);
    expect(facts.sleep?.efficiency).toBe(0.94);
    expect(facts.date).toBe("2026-04-19");
  });
});
