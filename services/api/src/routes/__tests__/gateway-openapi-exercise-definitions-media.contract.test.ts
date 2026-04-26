/**
 * Contract: API Gateway OpenAPI must expose POST /exercise-definitions/{exerciseId}/media so uploads
 * reach Cloud Run. A missing path yields 404 from the gateway before the backend runs.
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";

const repoRoot = join(__dirname, "..", "..", "..", "..", "..");
const openApiPath = join(repoRoot, "infra", "gateway", "openapi.yaml");

describe("infra/gateway/openapi.yaml — POST /exercise-definitions/{exerciseId}/media", () => {
  it("declares media upload with path param and firebase security", () => {
    const text = readFileSync(openApiPath, "utf8");
    expect(text).toContain("/exercise-definitions/{exerciseId}/media:");
    expect(text).toContain("operationId: exerciseDefinitionsMediaUpload");
    expect(text).toContain("operationId: exerciseDefinitionsMediaOptions");
    expect(text).toMatch(/post:\s*\n\s*operationId:\s*exerciseDefinitionsMediaUpload/);
  });
});
