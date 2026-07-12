/**
 * Source guard for Function post-raw path: no direct logger/console calls outside
 * the typed ouraPostRawTelemetry helper.
 */
import fs from "fs";
import path from "path";

const REPO_ROOT = path.resolve(__dirname, "../../../../..");

const GUARDED_FILES: string[] = [
  "services/functions/src/oura/ouraPostRawHandler.ts",
  "services/functions/src/oura/onOuraPostRawRequested.ts",
];

const DIRECT_LOGGER_CALL_REGEX = /\blogger\.(info|warn|error)\s*\(/;
const DIRECT_CONSOLE_CALL_REGEX = /\bconsole\.(log|warn|error)\s*\(/;

describe("Oura post-raw Function source guard", () => {
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

  it("guarded files route logging through logOuraPostRawTelemetry", () => {
    for (const relPath of GUARDED_FILES) {
      const absPath = path.join(REPO_ROOT, relPath);
      const source = fs.readFileSync(absPath, "utf8");
      expect(source.includes("logOuraPostRawTelemetry")).toBe(true);
    }
  });
});
