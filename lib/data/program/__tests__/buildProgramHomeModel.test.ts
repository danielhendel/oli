import { buildProgramHomeModel } from "@/lib/data/program/buildProgramHomeModel";
import { PROGRAM_BUILDER_ORDER } from "@/lib/data/program/types";

describe("buildProgramHomeModel", () => {
  it("returns the v1 placeholder command-center model", () => {
    const model = buildProgramHomeModel();
    expect(model.activeProgram).toBeNull();
    expect(model.savedPrograms).toEqual([]);
    expect(model.sharedPrograms).toEqual([]);
  });

  it("returns four builder cards in canonical order", () => {
    const model = buildProgramHomeModel();
    expect(model.builders.map((b) => b.type)).toEqual([
      "workout",
      "cardio",
      "nutrition",
      "recovery",
    ]);
    expect(model.builders.map((b) => b.type)).toEqual([...PROGRAM_BUILDER_ORDER]);
  });

  it("makes every builder card enabled and routed to its builder page", () => {
    const model = buildProgramHomeModel();
    const expectedHref: Record<string, string> = {
      workout: "/(app)/program/workout",
      cardio: "/(app)/program/cardio",
      nutrition: "/(app)/program/nutrition",
      recovery: "/(app)/program/recovery",
    };
    for (const builder of model.builders) {
      expect(builder.disabled).toBe(false);
      expect(builder.href).toBe(expectedHref[builder.type]);
      expect(builder.title.length).toBeGreaterThan(0);
      expect(builder.description.length).toBeGreaterThan(0);
      expect(builder.ctaLabel.length).toBeGreaterThan(0);
      expect(builder.statusLabel.length).toBeGreaterThan(0);
    }
  });

  it("is deterministic", () => {
    expect(buildProgramHomeModel()).toEqual(buildProgramHomeModel());
  });
});
