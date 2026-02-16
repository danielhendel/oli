/**
 * Phase 3A — Withings integration proof.
 * Asserts: Withings RawEvent kind in schema, Withings routes exist, at least one Withings ingestion test, strategy doc exists.
 */
import fs from "node:fs";
import path from "node:path";

describe("Phase 3A Withings proof", () => {
  const rootDir = path.resolve(__dirname, "../../..");

  it("Withings RawEvent kind exists in contracts schema", () => {
    const rawPath = path.join(rootDir, "lib/contracts/rawEvent.ts");
    expect(fs.existsSync(rawPath)).toBe(true);
    const text = fs.readFileSync(rawPath, "utf8");
    expect(text).toContain("withings.body_measurement");
  });

  it("Withings routes exist in API", () => {
    const withingsPath = path.join(rootDir, "services/api/src/routes/withings.ts");
    expect(fs.existsSync(withingsPath)).toBe(true);
    const text = fs.readFileSync(withingsPath, "utf8");
    expect(text).toContain("/connect");
    expect(text).toContain("/callback");
    expect(text).toContain("/pull");
    expect(text).toContain("/status");
  });

  it("at least one Withings ingestion test exists", () => {
    const apiTestPath = path.join(rootDir, "services/api/src/routes/__tests__/withings.test.ts");
    expect(fs.existsSync(apiTestPath)).toBe(true);
    const text = fs.readFileSync(apiTestPath, "utf8");
    expect(text).toMatch(/pull|connect|callback|RawEvent/);
  });

  it("Phase 3A strategy doc exists", () => {
    const strategyPath = path.join(rootDir, "docs/00_truth/phase3/PHASE_3A_INTEGRATION_STRATEGY.md");
    expect(fs.existsSync(strategyPath)).toBe(true);
  });

  it("OpenAPI allows POST and HEAD on /integrations/withings/callback (prevents 405 from gateway)", () => {
    const openApiPath = path.join(rootDir, "infra/gateway/openapi.yaml");
    expect(fs.existsSync(openApiPath)).toBe(true);
    const text = fs.readFileSync(openApiPath, "utf8");
    const callbackSection = (() => {
      const start = text.indexOf("/integrations/withings/callback:");
      if (start === -1) return "";
      const nextPath = text.indexOf("\n  /", start + 1);
      return nextPath === -1 ? text.slice(start) : text.slice(start, nextPath);
    })();
    expect(callbackSection).toContain("post:");
    expect(callbackSection).toContain("head:");
    expect(callbackSection).toMatch(/operationId:\s*withingsCallbackPost/);
    expect(callbackSection).toMatch(/operationId:\s*withingsCallbackHead/);
  });
});
