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

  it("includes GET/POST /users/me/nutrition/pantry", () => {
    expect(yaml).toContain("/users/me/nutrition/pantry:");
  });

  it("includes DELETE /users/me/nutrition/pantry/{id}", () => {
    expect(yaml).toContain("/users/me/nutrition/pantry/{id}:");
  });

  it("includes GET/POST /users/me/nutrition/meals", () => {
    expect(yaml).toContain("/users/me/nutrition/meals:");
  });

  it("includes DELETE /users/me/nutrition/meals/{id}", () => {
    expect(yaml).toContain("/users/me/nutrition/meals/{id}:");
  });

  it("includes GET /users/me/nutrition/stores", () => {
    expect(yaml).toContain("/users/me/nutrition/stores:");
  });
});
