// Ensures Document Ingestion OS routes stay registered for API Gateway.
import { readFileSync } from "node:fs";
import { join } from "node:path";

const repoRoot = join(__dirname, "..", "..", "..", "..", "..");
const openApiPath = join(repoRoot, "infra", "gateway", "openapi.yaml");

describe("infra/gateway/openapi.yaml — document ingestion OS routes", () => {
  let yaml: string;

  beforeAll(() => {
    yaml = readFileSync(openApiPath, "utf8");
  });

  it("includes GET /users/me/documents", () => {
    expect(yaml).toContain("/users/me/documents:");
  });

  it("includes POST /users/me/documents/upload-intent", () => {
    expect(yaml).toContain("/users/me/documents/upload-intent:");
  });

  it("includes GET/DELETE /users/me/documents/{documentId}", () => {
    expect(yaml).toContain("/users/me/documents/{documentId}:");
  });

  it("includes POST complete-upload", () => {
    expect(yaml).toContain("/users/me/documents/{documentId}/complete-upload:");
  });

  it("includes POST reprocess", () => {
    expect(yaml).toContain("/users/me/documents/{documentId}/reprocess:");
  });

  it("includes GET view-original", () => {
    expect(yaml).toContain("/users/me/documents/{documentId}/view-original:");
  });
});
