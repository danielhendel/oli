// Ensures dev nutrition food routes stay registered for API Gateway (deploy drift guard).
import { readFileSync } from "node:fs";
import { join } from "node:path";

const repoRoot = join(__dirname, "..", "..", "..", "..", "..");
const openApiPath = join(repoRoot, "infra", "gateway", "openapi.yaml");

describe("infra/gateway/openapi.yaml — nutrition dev catalog routes", () => {
  let yaml: string;

  beforeAll(() => {
    yaml = readFileSync(openApiPath, "utf8");
  });

  it("includes GET /users/me/nutrition/food-search", () => {
    expect(yaml).toContain("/users/me/nutrition/food-search:");
  });

  it("includes GET /users/me/nutrition/food/{id}", () => {
    expect(yaml).toContain("/users/me/nutrition/food/{id}:");
  });

  it("includes GET /users/me/nutrition/food-by-barcode/{barcode}", () => {
    expect(yaml).toContain("/users/me/nutrition/food-by-barcode/{barcode}:");
  });
});
