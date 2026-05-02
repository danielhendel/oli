import { getSectionReadiness } from "../moduleReadiness";

describe("moduleReadiness — nutrition sections", () => {
  it("enables overview, library, log, search, scan, and targets now that module UX is implemented", () => {
    expect(getSectionReadiness("nutrition.overview").disabled).toBe(false);
    expect(getSectionReadiness("nutrition.library").disabled).toBe(false);
    expect(getSectionReadiness("nutrition.log").disabled).toBe(false);
    expect(getSectionReadiness("nutrition.search").disabled).toBe(false);
    expect(getSectionReadiness("nutrition.scan").disabled).toBe(false);
    expect(getSectionReadiness("nutrition.targets").disabled).toBe(false);
  });
});
