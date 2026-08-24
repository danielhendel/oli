// Ensures Stage 1B account export status/download routes stay registered for API Gateway.
import { readFileSync } from "node:fs";
import { join } from "node:path";

const repoRoot = join(__dirname, "..", "..", "..", "..", "..");
const openApiPath = join(repoRoot, "infra", "gateway", "openapi.yaml");

describe("infra/gateway/openapi.yaml — account export routes", () => {
  let yaml: string;

  beforeAll(() => {
    yaml = readFileSync(openApiPath, "utf8");
  });

  it("includes POST /export", () => {
    expect(yaml).toContain("/export:");
    expect(yaml).toContain("operationId: exportPost");
  });

  it("includes GET /export/latest", () => {
    expect(yaml).toContain("/export/latest:");
    expect(yaml).toContain("operationId: exportLatestGet");
  });

  it("includes GET /export/{requestId}", () => {
    expect(yaml).toContain("/export/{requestId}:");
    expect(yaml).toContain("operationId: exportByRequestIdGet");
  });

  it("includes GET /export/{requestId}/download", () => {
    expect(yaml).toContain("/export/{requestId}/download:");
    expect(yaml).toContain("operationId: exportDownloadGet");
  });
});
