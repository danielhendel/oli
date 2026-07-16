/**
 * Source guard: generic API access-log production files must not call
 * logger.info/warn/error or console.log/warn/error directly. Logging must go
 * through `logApiAccessTelemetry` / `buildApiAccessTelemetryEvent`.
 *
 * Scoped to access-log files only — not a repository-wide logger prohibition.
 */
import fs from "fs";
import path from "path";

const REPO_ROOT = path.resolve(__dirname, "../../../../..");

/** Production access-log files that MUST route logging through the typed helper. */
const GUARDED_FILES: string[] = [
  "services/api/src/middleware/accessLogMiddleware.ts",
];

const DIRECT_LOGGER_CALL_REGEX = /\blogger\.(info|warn|error)\s*\(/;
const DIRECT_CONSOLE_CALL_REGEX = /\bconsole\.(log|warn|error)\s*\(/;

describe("API access-log source guard", () => {
  for (const relPath of GUARDED_FILES) {
    it(`${relPath} has no direct logger.*/console.* calls`, () => {
      const absPath = path.join(REPO_ROOT, relPath);
      expect(fs.existsSync(absPath)).toBe(true);
      const source = fs.readFileSync(absPath, "utf8");

      const loggerMatches = source.match(new RegExp(DIRECT_LOGGER_CALL_REGEX, "g")) ?? [];
      const consoleMatches = source.match(new RegExp(DIRECT_CONSOLE_CALL_REGEX, "g")) ?? [];

      expect({ file: relPath, loggerCalls: loggerMatches, consoleCalls: consoleMatches }).toEqual({
        file: relPath,
        loggerCalls: [],
        consoleCalls: [],
      });
    });
  }

  it("access middleware routes through logApiAccessTelemetry", () => {
    const absPath = path.join(REPO_ROOT, GUARDED_FILES[0]!);
    const source = fs.readFileSync(absPath, "utf8");
    expect(source.includes("logApiAccessTelemetry")).toBe(true);
    expect(source.includes("buildApiAccessTelemetryEvent")).toBe(true);
    expect(source.includes("originalUrl")).toBe(false);
    expect(source.includes("req.query")).toBe(false);
    expect(source.includes("req.uid")).toBe(false);
    expect(/\buid\s*:/.test(source)).toBe(false);
  });

  it("typed helper is the sole logger.info call site for access telemetry", () => {
    const absPath = path.join(REPO_ROOT, "services/api/src/lib/apiAccessTelemetry.ts");
    expect(fs.existsSync(absPath)).toBe(true);
    const source = fs.readFileSync(absPath, "utf8");
    expect(source.includes("logger.info")).toBe(true);
    expect(source.includes("http_request_completed")).toBe(true);
    // Helper must not accept free-form spreads from req/res
    expect(source.includes("...req")).toBe(false);
    expect(source.includes("...res")).toBe(false);
  });
});
