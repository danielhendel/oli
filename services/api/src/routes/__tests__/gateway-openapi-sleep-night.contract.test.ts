// Ensures canonical SleepNight route stays registered for API Gateway (deploy drift guard).
import { readFileSync } from "node:fs";
import { join } from "node:path";

const repoRoot = join(__dirname, "..", "..", "..", "..", "..");
const openApiPath = join(repoRoot, "infra", "gateway", "openapi.yaml");

describe("infra/gateway/openapi.yaml — GET /users/me/sleep-night", () => {
  let yaml: string;

  beforeAll(() => {
    yaml = readFileSync(openApiPath, "utf8");
  });

  it("includes GET /users/me/sleep-night with required day query", () => {
    expect(yaml).toContain("/users/me/sleep-night:");
    expect(yaml).toContain("operationId: sleepNightGet");
    expect(yaml).toContain("name: day");
    expect(yaml).toContain("required: true");
  });
});
