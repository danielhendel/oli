import { OURA_STRESS_RANGE_API_PATH } from "../ouraStress";

describe("ouraStress client path", () => {
  it("exports the gateway path constant", () => {
    expect(OURA_STRESS_RANGE_API_PATH).toBe("/users/me/oura-stress");
  });
});
