/**
 * Source guard: fails if any file in the active Oura refresh path calls
 * logger.info/warn/error or console.log/warn/error directly instead of routing
 * through the typed ouraRefreshTelemetry / ouraPostRawTelemetry helpers.
 *
 * Importing the telemetry module (and calling its exported functions) is allowed —
 * only direct logger/console calls are forbidden in these files.
 */
import fs from "fs";
import path from "path";

const REPO_ROOT = path.resolve(__dirname, "../../../../..");

/** Files that MUST NOT call logger.info/warn/error or console.log/warn/error directly. */
const GUARDED_FILES: string[] = [
  "services/api/src/routes/integrations/ouraPullNow.ts",
  "services/api/src/lib/ouraApi.ts",
  "services/api/src/lib/ouraVendorSnapshot.ts",
  "services/api/src/lib/ouraIngestWrite.ts",
  "services/api/src/lib/ouraTokenRefreshSingleFlight.ts",
];

/** logger.info(...) / logger.warn(...) / logger.error(...) as a direct call. */
const DIRECT_LOGGER_CALL_REGEX = /\blogger\.(info|warn|error)\s*\(/;
const DIRECT_CONSOLE_CALL_REGEX = /\bconsole\.(log|warn|error)\s*\(/;

describe("Oura refresh path source guard", () => {
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

  it("guarded files still route logging through logOuraRefreshTelemetry", () => {
    for (const relPath of GUARDED_FILES) {
      const absPath = path.join(REPO_ROOT, relPath);
      const source = fs.readFileSync(absPath, "utf8");
      expect(source.includes("logOuraRefreshTelemetry") || source.includes("categorizeOuraSafeError")).toBe(true);
    }
  });
});
