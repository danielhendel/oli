import { LOCAL_IMPORTED_IMAGE_FIXTURE } from "../../exercise-media-os/candidate-production/fixtures/localImportedImageFixture";
import { APPROVED_BENCH_PRESS_IMAGE_FIXTURE_CANDIDATES } from "../../exercise-media-os/image-pack/fixtures/approvedBenchPressImageCandidates";
import { resolveExerciseThumbnail } from "../resolveExerciseThumbnail";

describe("resolveExerciseThumbnail", () => {
  it("returns muscle-equipment placeholder for unknown exercises with metadata", () => {
    const source = resolveExerciseThumbnail({
      exerciseId: "unknown_exercise",
      exerciseName: "Unknown Move",
      primaryMuscle: "Back",
      equipment: "Cable",
    });

    expect(source.kind).toBe("muscle-equipment-placeholder");
    expect(source.isRenderableImage).toBe(false);
    expect(source.src).toBeUndefined();
    expect(source.alt).toContain("Unknown Move");
  });

  it("returns media placeholder when no muscle metadata exists", () => {
    const source = resolveExerciseThumbnail({
      exerciseId: "custom_move",
      exerciseName: "Custom Move",
    });

    expect(source.kind).toBe("media-placeholder");
    expect(source.isRenderableImage).toBe(false);
    expect(source.label).toBe("Image pending");
  });

  it("returns placeholder for bench_press when live PNGs are absent", () => {
    const source = resolveExerciseThumbnail({
      exerciseId: "bench_press",
      exerciseName: "Bench Press",
      primaryMuscle: "Chest",
      equipment: "Barbell",
    });

    expect(source.isRenderableImage).toBe(false);
    expect(source.src).toBeUndefined();
    expect(source.kind).not.toBe("approved-master-image");
    expect(source.kind).not.toBe("imported-keyframe-candidate");
    expect(source.label).not.toBe("Approved master");
    expect(source.label).not.toBe("Dev preview");
  });

  it("live dev-test images are not approved-master-image", () => {
    const source = resolveExerciseThumbnail({
      exerciseId: "bench_press",
      exerciseName: "Bench Press",
    });
    expect(source.kind).not.toBe("approved-master-image");
    expect(source.label).not.toBe("Approved master");
  });

  it("returns approved-master image for approved fixture candidates", () => {
    const source = resolveExerciseThumbnail({
      exerciseId: "bench_press",
      exerciseName: "Bench Press",
      approvedMasterCandidatesOverride: APPROVED_BENCH_PRESS_IMAGE_FIXTURE_CANDIDATES,
    });

    expect(source.kind).toBe("approved-master-image");
    expect(source.isRenderableImage).toBe(true);
    expect(source.src).toBeTruthy();
    expect(source.label).toBe("Approved master");
  });

  it("returns imported keyframe candidate when file presence override is true", () => {
    const source = resolveExerciseThumbnail({
      exerciseId: "bench_press",
      exerciseName: "Bench Press",
      filePresenceOverrides: {
        [LOCAL_IMPORTED_IMAGE_FIXTURE.expectedPublicPath]: true,
      },
    });

    expect(source.kind).toBe("imported-keyframe-candidate");
    expect(source.isRenderableImage).toBe(true);
    expect(source.src).toBe(LOCAL_IMPORTED_IMAGE_FIXTURE.expectedPublicPath);
    expect(source.label).toBe("Dev preview");
    expect(source.label).not.toBe("Approved master");
  });

  it("does not return src when file metadata says missing", () => {
    const source = resolveExerciseThumbnail({
      exerciseId: "bench_press",
      exerciseName: "Bench Press",
      filePresenceOverrides: {
        [LOCAL_IMPORTED_IMAGE_FIXTURE.expectedPublicPath]: false,
      },
    });

    expect(source.isRenderableImage).toBe(false);
    expect(source.src).toBeUndefined();
  });

  it("uses meaningful alt text", () => {
    const source = resolveExerciseThumbnail({
      exerciseId: "bench_press",
      exerciseName: "Bench Press",
    });
    expect(source.alt.toLowerCase()).toContain("bench press");
  });
});
