/**
 * Contract: API Gateway OpenAPI must expose POST /integrations/oura/sleep-day-refresh
 * so Sleep today-recovery and pull-to-refresh reach Cloud Run (missing path → ESPv2 404).
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";

/** From services/api/src/routes/__tests__ → repo root (oli/) */
const repoRoot = join(__dirname, "..", "..", "..", "..", "..");
const openApiPath = join(repoRoot, "infra", "gateway", "openapi.yaml");

/** Mobile client path (lib/api/ouraSleepDayRefresh.ts OURA_SLEEP_DAY_REFRESH_API_PATH). */
const OURA_SLEEP_DAY_REFRESH_PATH = "/integrations/oura/sleep-day-refresh";

describe("infra/gateway/openapi.yaml — POST /integrations/oura/sleep-day-refresh", () => {
  let yaml: string;

  beforeAll(() => {
    yaml = readFileSync(openApiPath, "utf8");
  });

  it("declares the path the mobile client calls", () => {
    expect(yaml).toContain(`${OURA_SLEEP_DAY_REFRESH_PATH}:`);
  });

  it("matches lib/api OURA_SLEEP_DAY_REFRESH_API_PATH constant", () => {
    const libPath = join(repoRoot, "lib", "api", "ouraSleepDayRefresh.ts");
    const libSource = readFileSync(libPath, "utf8");
    expect(libSource).toContain(
      'OURA_SLEEP_DAY_REFRESH_API_PATH = "/integrations/oura/sleep-day-refresh"',
    );
  });

  it("declares POST with firebase security and Idempotency-Key (same as pull-now)", () => {
    expect(yaml).toContain("operationId: ouraSleepDayRefreshPost");
    expect(yaml).toContain("operationId: ouraSleepDayRefreshOptions");
    expect(yaml).toMatch(
      new RegExp(
        `${OURA_SLEEP_DAY_REFRESH_PATH.replace(/\//g, "\\/")}:[\\s\\S]*?post:[\\s\\S]*?security:[\\s\\S]*?firebase:`,
      ),
    );
    expect(yaml).toMatch(
      new RegExp(
        `${OURA_SLEEP_DAY_REFRESH_PATH.replace(/\//g, "\\/")}:[\\s\\S]*?Idempotency-Key`,
      ),
    );
  });
});
