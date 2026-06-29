import { BUILDER_NAV_SECTIONS } from "../workoutStudioNavigation";

describe("workout studio layout structure", () => {
  it("defines builder navigator sections for independent workspace columns", () => {
    expect(BUILDER_NAV_SECTIONS).toContain("overview");
    expect(BUILDER_NAV_SECTIONS).toContain("projectedVolume");
    expect(BUILDER_NAV_SECTIONS).toContain("blocks");
    expect(BUILDER_NAV_SECTIONS).toContain("library");
    expect(BUILDER_NAV_SECTIONS).toHaveLength(7);
  });
});
