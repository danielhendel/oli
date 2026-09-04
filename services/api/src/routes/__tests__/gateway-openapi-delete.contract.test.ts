// Ensures Stage 1C account deletion status routes stay registered for API Gateway.
import { readFileSync } from "node:fs";
import { join } from "node:path";

const repoRoot = join(__dirname, "..", "..", "..", "..", "..");
const openApiPath = join(repoRoot, "infra", "gateway", "openapi.yaml");

describe("infra/gateway/openapi.yaml — account deletion routes", () => {
  let yaml: string;

  beforeAll(() => {
    yaml = readFileSync(openApiPath, "utf8");
  });

  it("includes POST /account/delete", () => {
    expect(yaml).toContain("/account/delete:");
    expect(yaml).toContain("operationId: accountDeletePost");
  });

  it("includes GET /delete/latest", () => {
    expect(yaml).toContain("/delete/latest:");
    expect(yaml).toContain("operationId: deleteLatestGet");
  });

  it("includes GET /delete/{requestId}", () => {
    expect(yaml).toContain("/delete/{requestId}:");
    expect(yaml).toContain("operationId: deleteByRequestIdGet");
  });
});
