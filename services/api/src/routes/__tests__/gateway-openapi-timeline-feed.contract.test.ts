import { readFileSync } from "node:fs";
import { join } from "node:path";

const repoRoot = join(__dirname, "..", "..", "..", "..", "..");
const openApiPath = join(repoRoot, "infra", "gateway", "openapi.yaml");

describe("infra/gateway/openapi.yaml — GET /users/me/timeline-feed", () => {
  let yaml: string;

  beforeAll(() => {
    yaml = readFileSync(openApiPath, "utf8");
  });

  it("includes GET /users/me/timeline-feed with feed query params", () => {
    expect(yaml).toContain("/users/me/timeline-feed:");
    expect(yaml).toContain("operationId: timelineFeedGet");
    expect(yaml).toContain("name: anchorDay");
    expect(yaml).toContain("name: cursor");
    expect(yaml).toContain("name: limit");
  });
});
