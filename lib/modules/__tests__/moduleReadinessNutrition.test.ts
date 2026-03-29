import { getSectionReadiness } from "../moduleReadiness";

describe("moduleReadiness — nutrition sections", () => {
  it("enables overview, log, and targets now that module UX is implemented", () => {
    expect(getSectionReadiness("nutrition.overview").disabled).toBe(false);
    expect(getSectionReadiness("nutrition.log").disabled).toBe(false);
    expect(getSectionReadiness("nutrition.targets").disabled).toBe(false);
  });
});
