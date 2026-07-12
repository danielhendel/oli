import { OURA_READINESS_RANGE_API_PATH } from "@/lib/api/ouraReadinessRange";

describe("ouraReadinessRange API path", () => {
  it("matches gateway / API mount path", () => {
    expect(OURA_READINESS_RANGE_API_PATH).toBe("/users/me/oura-readiness-range");
  });
});
