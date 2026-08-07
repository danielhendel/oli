/**
 * Contract: API Gateway OpenAPI must expose GET /users/me/labs/metrics/{metricKey}/history
 * so mobile historical labs history reaches Cloud Run (missing path → ESPv2 404).
 *
 * Auth note: infra/gateway/openapi.yaml declares firebase JWT only (Authorization: Bearer).
 * There is no x-api-key security scheme in OpenAPI. lib/api/http.ts detects x-api-key for
 * telemetry only; some CLI scripts send it, but the mobile client uses Firebase ID tokens
 * via apiGetZodAuthed (see lib/api/labsHistory.ts).
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";

const repoRoot = join(__dirname, "..", "..", "..", "..", "..");
const openApiPath = join(repoRoot, "infra", "gateway", "openapi.yaml");

const METRIC_DETAIL_PATH = "/users/me/labs/metrics/{metricKey}";
const METRIC_HISTORY_PATH = "/users/me/labs/metrics/{metricKey}/history";

function escapeForRegex(path: string): string {
  return path.replace(/\//g, "\\/").replace(/\{/g, "\\{").replace(/\}/g, "\\}");
}

function extractPathBlock(yaml: string, path: string): string {
  const match = yaml.match(
    new RegExp(`${escapeForRegex(path)}:[\\s\\S]*?(?=\\n  \\/|$)`),
  );
  expect(match).not.toBeNull();
  return match![0];
}

describe("infra/gateway/openapi.yaml — labs metric history routes", () => {
  let yaml: string;
  let historyBlock: string;

  beforeAll(() => {
    yaml = readFileSync(openApiPath, "utf8");
    historyBlock = extractPathBlock(yaml, METRIC_HISTORY_PATH);
  });

  it("includes GET /users/me/labs/metrics/{metricKey}/history", () => {
    expect(yaml).toContain(`${METRIC_HISTORY_PATH}:`);
  });

  it("requires metricKey path parameter", () => {
    expect(historyBlock).toContain("name: metricKey");
    expect(historyBlock).toContain("in: path");
    expect(historyBlock).toMatch(/name: metricKey[\s\S]*?required: true/);
  });

  it("declares GET operationId labsMetricHistoryGet with firebase security", () => {
    expect(historyBlock).toContain("operationId: labsMetricHistoryGet");
    expect(historyBlock).toMatch(/get:[\s\S]*?security:[\s\S]*?firebase: \[\]/);
  });

  it("declares OPTIONS operation for CORS preflight", () => {
    expect(historyBlock).toContain("operationId: labsMetricHistoryOptions");
    expect(historyBlock).toMatch(/options:[\s\S]*?security: \[\]/);
  });

  it("includes limit and cursor query parameters", () => {
    expect(historyBlock).toContain("name: limit");
    expect(historyBlock).toContain("in: query");
    expect(historyBlock).toContain("name: cursor");
  });

  it("includes 200 and 401 responses", () => {
    expect(historyBlock).toMatch(/get:[\s\S]*?200:/);
    expect(historyBlock).toMatch(/get:[\s\S]*?401:/);
  });

  it("uses firebase JWT securityDefinitions (Authorization Bearer, no API key scheme)", () => {
    expect(yaml).toContain("securityDefinitions:");
    expect(yaml).toContain("firebase:");
    expect(yaml).toContain('header: "Authorization"');
    expect(yaml).toContain("No API key security scheme");
    expect(yaml).not.toMatch(/securityDefinitions:[\s\S]*x-api-key/);
  });

  it("still includes GET /users/me/labs/metrics/{metricKey} (no regression)", () => {
    expect(yaml).toContain(`${METRIC_DETAIL_PATH}:`);
    const detailBlock = extractPathBlock(yaml, METRIC_DETAIL_PATH);
    expect(detailBlock).toContain("operationId: labsMetricDetailGet");
    expect(detailBlock).toContain("operationId: labsMetricDetailOptions");
  });

  it("matches lib/api getLabMetricHistory client path", () => {
    const libSource = readFileSync(join(repoRoot, "lib", "api", "labsHistory.ts"), "utf8");
    expect(libSource).toContain(
      "`/users/me/labs/metrics/${encodeURIComponent(metricKey)}/history",
    );
  });
});
