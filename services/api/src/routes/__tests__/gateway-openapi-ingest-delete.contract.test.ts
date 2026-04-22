/**
 * Contract: API Gateway OpenAPI must expose DELETE /ingest/{rawEventId} so encoded workout ids
 * (e.g. %3A) reach Cloud Run. A missing path yields ESPv2 "Unknown Operation Name" / direct_response.
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";

/** From services/api/src/routes/__tests__ → repo root (oli/) */
const repoRoot = join(__dirname, "..", "..", "..", "..", "..");
const openApiPath = join(repoRoot, "infra", "gateway", "openapi.yaml");

describe("infra/gateway/openapi.yaml — DELETE /ingest/{rawEventId}", () => {
  it("declares /ingest/{rawEventId} delete with path param (no restrictive pattern)", () => {
    const text = readFileSync(openApiPath, "utf8");
    expect(text).toContain("/ingest/{rawEventId}:");
    expect(text).toContain("operationId: ingestRawEventDelete");
    expect(text).toContain("in: path");
    expect(text).toContain("name: rawEventId");
    expect(text).toMatch(/delete:\s*\n\s*operationId:\s*ingestRawEventDelete/);
  });
});
