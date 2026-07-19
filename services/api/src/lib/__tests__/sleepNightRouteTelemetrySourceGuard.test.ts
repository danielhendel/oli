/**
 * Source guard: SleepNight route version/range markers must emit only through
 * `sleepNightRouteTelemetry.ts` with a closed privacy-safe payload.
 *
 * Does not forbid legitimate uid/day locals used for auth, validation, or reads.
 */
import fs from "fs";
import path from "path";

const REPO_ROOT = path.resolve(__dirname, "../../../../..");

const HELPER_REL = "services/api/src/lib/sleepNightRouteTelemetry.ts";
const ROUTE_REL = "services/api/src/routes/usersMe.ts";

const PROHIBITED_TELEMETRY_IDENTIFIERS = [
  "uid",
  "userId",
  "requestedDay",
  "resolvedDay",
  "anchorDay",
  "wakeDay",
  "start",
  "end",
  "date",
  "timestamp",
  "score",
  "durationMinutes",
  "sleepId",
  "providerId",
  "documentId",
  "cursor",
  "url",
  "query",
  "token",
  "authorization",
  "payload",
  "response",
  "error",
  "stack",
] as const;

describe("SleepNight route telemetry source guard", () => {
  it("typed helper exists and is the sole SLEEP_NIGHT_ROUTE_VERSION logger payload", () => {
    const abs = path.join(REPO_ROOT, HELPER_REL);
    expect(fs.existsSync(abs)).toBe(true);
    const source = fs.readFileSync(abs, "utf8");

    expect(source.includes('msg: "[SLEEP_NIGHT_ROUTE_VERSION]"')).toBe(true);
    expect(source.includes('version: "sleep-night-resolution-v2"')).toBe(true);
    expect(source.includes("logger.info")).toBe(true);
    expect(source.includes("...")).toBe(false);

    for (const id of PROHIBITED_TELEMETRY_IDENTIFIERS) {
      // Property-style and type-field style: `uid:` / `uid?:` / `"uid"`
      const prop = new RegExp(`(?:^|[\\s,{])${id}\\s*[?:]?\\s*:`, "m");
      const quoted = new RegExp(`["']${id}["']\\s*:`);
      expect({ id, propHit: prop.test(source), quotedHit: quoted.test(source) }).toEqual({
        id,
        propHit: false,
        quotedHit: false,
      });
    }
  });

  it("usersMe sleep-night routes call typed helpers and do not inline route-version payloads", () => {
    const abs = path.join(REPO_ROOT, ROUTE_REL);
    expect(fs.existsSync(abs)).toBe(true);
    const source = fs.readFileSync(abs, "utf8");

    expect(source.includes("logSleepNightRouteVersionTelemetry")).toBe(true);
    expect(source.includes("logSleepNightRangeRouteTelemetry")).toBe(true);

    // No inline reconstruction of the blocked event family.
    expect(source.includes('msg: "[SLEEP_NIGHT_ROUTE_VERSION]"')).toBe(false);
    expect(source.includes('msg: "[SLEEP_NIGHT_RANGE_ROUTE]"')).toBe(false);

    // The historical prohibited pairing must not reappear as a logger object.
    expect(/logger\.info\(\s*\{[^}]*SLEEP_NIGHT_ROUTE_VERSION[^}]*uid/s.test(source)).toBe(false);
    expect(/logger\.info\(\s*\{[^}]*requestedDay[^}]*uid/s.test(source)).toBe(false);
  });
});
