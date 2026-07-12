import { readFileSync } from "node:fs";
import { join } from "node:path";

const repoRoot = join(__dirname, "..", "..", "..", "..", "..");
const openApiPath = join(repoRoot, "infra", "gateway", "openapi.yaml");

describe("infra/gateway/openapi.yaml — GET /users/me/sleep-nights", () => {
  let yaml: string;

  beforeAll(() => {
    yaml = readFileSync(openApiPath, "utf8");
  });

  it("includes GET /users/me/sleep-nights with required start and end", () => {
    expect(yaml).toContain("/users/me/sleep-nights:");
    expect(yaml).toContain("operationId: sleepNightsRangeGet");
    expect(yaml).toContain("name: start");
    expect(yaml).toContain("name: end");
  });
});
