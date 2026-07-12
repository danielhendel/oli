import { readFileSync } from "node:fs";
import { join } from "node:path";

const repoRoot = join(__dirname, "..", "..", "..", "..", "..");
const openApiPath = join(repoRoot, "infra", "gateway", "openapi.yaml");

describe("infra/gateway/openapi.yaml — GET /users/me/oura-readiness-range", () => {
  let yaml: string;

  beforeAll(() => {
    yaml = readFileSync(openApiPath, "utf8");
  });

  it("includes GET /users/me/oura-readiness-range with required start and end", () => {
    expect(yaml).toContain("/users/me/oura-readiness-range:");
    expect(yaml).toContain("operationId: ouraReadinessRangeGet");
    expect(yaml).toContain("name: start");
    expect(yaml).toContain("name: end");
  });
});
