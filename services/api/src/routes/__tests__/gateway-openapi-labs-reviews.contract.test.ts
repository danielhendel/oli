// Ensures Labs OS review routes stay registered for API Gateway (Phase 3D-A).
import { readFileSync } from "node:fs";
import { join } from "node:path";

const repoRoot = join(__dirname, "..", "..", "..", "..", "..");
const openApiPath = join(repoRoot, "infra", "gateway", "openapi.yaml");

describe("infra/gateway/openapi.yaml — labs review routes", () => {
  let yaml: string;

  beforeAll(() => {
    yaml = readFileSync(openApiPath, "utf8");
  });

  it("includes GET /users/me/labs/reviews", () => {
    expect(yaml).toContain("/users/me/labs/reviews:");
  });

  it("includes GET /users/me/labs/reviews/{documentId}", () => {
    expect(yaml).toContain("/users/me/labs/reviews/{documentId}:");
  });

  it("includes PATCH candidates/{candidateId}", () => {
    expect(yaml).toContain("/users/me/labs/reviews/{documentId}/candidates/{candidateId}:");
  });

  it("includes POST accept", () => {
    expect(yaml).toContain("/users/me/labs/reviews/{documentId}/accept:");
  });

  it("includes POST reject", () => {
    expect(yaml).toContain("/users/me/labs/reviews/{documentId}/reject:");
  });
});
