import { buildBenchPressKeyframeCandidateQaWorksheet } from "../buildBenchPressKeyframeCandidateQaWorksheet";
import { buildCandidateImageQaWorksheet } from "../buildCandidateImageQaWorksheet";
import { LOCAL_IMPORTED_IMAGE_FIXTURE } from "../../candidate-production/fixtures/localImportedImageFixture";
import { buildMediaCandidateFromImageImport } from "../../candidate-production/buildMediaCandidateFromImageImport";
import { buildBenchPressImportedImageCandidates } from "../../candidate-production/buildBenchPressImportedImageCandidates";
import { buildBenchPressKeyframeImportManifest } from "../../candidate-production/buildBenchPressKeyframeImportManifest";

describe("buildCandidateImageQaWorksheet", () => {
  const generic = buildCandidateImageQaWorksheet({
    exerciseId: "bench_press",
    candidateId: "test-candidate",
    keyframePoseId: "setup",
    renderTarget: "16:9",
  });

  it("generic worksheet includes watermark/logos/text/anatomy/equipment checks", () => {
    const labels = generic.items.map((item) => item.label.toLowerCase()).join(" ");
    expect(labels).toMatch(/watermark/);
    expect(labels).toMatch(/logo/);
    expect(labels).toMatch(/readable text/);
    expect(labels).toMatch(/anatomy/);
    expect(labels).toMatch(/equipment/);
  });

  it("every critical hard gate blocks master approval", () => {
    const criticalItems = generic.items.filter((item) => item.severity === "critical");
    expect(criticalItems.length).toBeGreaterThan(0);
    for (const item of criticalItems) {
      expect(item.blocksMasterApproval).toBe(true);
    }
  });

  it("worksheet status is not-reviewed by default", () => {
    expect(generic.reviewStatus).toBe("not-reviewed");
  });
});

describe("buildBenchPressKeyframeCandidateQaWorksheet", () => {
  const { candidate } = buildMediaCandidateFromImageImport(LOCAL_IMPORTED_IMAGE_FIXTURE);

  it("setup worksheet includes setup-specific checks", () => {
    const setupCandidate = { ...candidate!, keyframePoseId: "setup" as const };
    const worksheet = buildBenchPressKeyframeCandidateQaWorksheet(setupCandidate);
    const haystack = worksheet.items.map((item) => item.label).join(" ").toLowerCase();
    expect(haystack).toMatch(/lying on bench/);
    expect(haystack).toMatch(/feet planted/);
  });

  it("bottom worksheet includes chest/sternum touch and pause checks", () => {
    const bottomCandidate = { ...candidate!, keyframePoseId: "bottom_chest_pause" as const };
    const worksheet = buildBenchPressKeyframeCandidateQaWorksheet(bottomCandidate);
    const haystack = worksheet.items.map((item) => item.description).join(" ").toLowerCase();
    expect(haystack).toMatch(/chest|sternum/);
    expect(haystack).toMatch(/pause/);
  });

  it("finish worksheet includes no second descent check", () => {
    const finishCandidate = { ...candidate!, keyframePoseId: "finish_lockout" as const };
    const worksheet = buildBenchPressKeyframeCandidateQaWorksheet(finishCandidate);
    const haystack = worksheet.items.map((item) => item.label).join(" ").toLowerCase();
    expect(haystack).toMatch(/second descent/);
  });

  it("no worksheet marks candidate approved", () => {
    const worksheet = buildBenchPressKeyframeCandidateQaWorksheet(candidate!);
    const serialized = JSON.stringify(worksheet);
    expect(serialized).not.toMatch(/approved-master/);
    expect(worksheet.reviewStatus).toBe("not-reviewed");
  });
});

describe("buildBenchPressKeyframeCandidateQaWorksheet for imported Google Flow candidates", () => {
  const ALL_PRESENT_MAP = {
    "/media/exercises/bench_press/keyframes/setup-16x9.png": true,
    "/media/exercises/bench_press/keyframes/start-lockout-16x9.png": true,
    "/media/exercises/bench_press/keyframes/bottom-chest-pause-16x9.png": true,
    "/media/exercises/bench_press/keyframes/finish-lockout-16x9.png": true,
  } as const;

  const importedCandidates = buildBenchPressImportedImageCandidates(
    buildBenchPressKeyframeImportManifest({ filePresenceMap: ALL_PRESENT_MAP }),
  ).candidates;

  it("produces worksheets for all 4 imported candidates", () => {
    expect(importedCandidates).toHaveLength(4);
    for (const candidate of importedCandidates) {
      const worksheet = buildBenchPressKeyframeCandidateQaWorksheet(candidate);
      expect(worksheet.reviewStatus).toBe("not-reviewed");
      expect(worksheet.candidateId).toBe(candidate.candidateId);
    }
  });

  it("imported setup worksheet includes setup-specific checks", () => {
    const setup = importedCandidates.find((candidate) => candidate.keyframePoseId === "setup")!;
    const haystack = buildBenchPressKeyframeCandidateQaWorksheet(setup)
      .items.map((item) => item.label)
      .join(" ")
      .toLowerCase();
    expect(haystack).toMatch(/lying on bench/);
    expect(haystack).toMatch(/feet planted/);
  });

  it("imported start_lockout worksheet includes lockout checks", () => {
    const start = importedCandidates.find(
      (candidate) => candidate.keyframePoseId === "start_lockout",
    )!;
    const haystack = buildBenchPressKeyframeCandidateQaWorksheet(start)
      .items.map((item) => item.label)
      .join(" ")
      .toLowerCase();
    expect(haystack).toMatch(/lockout|elbow/);
  });

  it("imported bottom_chest_pause worksheet includes chest/sternum and pause", () => {
    const bottom = importedCandidates.find(
      (candidate) => candidate.keyframePoseId === "bottom_chest_pause",
    )!;
    const haystack = buildBenchPressKeyframeCandidateQaWorksheet(bottom)
      .items.map((item) => item.description)
      .join(" ")
      .toLowerCase();
    expect(haystack).toMatch(/chest|sternum/);
    expect(haystack).toMatch(/pause/);
  });

  it("imported finish_lockout worksheet includes no second descent", () => {
    const finish = importedCandidates.find(
      (candidate) => candidate.keyframePoseId === "finish_lockout",
    )!;
    const haystack = buildBenchPressKeyframeCandidateQaWorksheet(finish)
      .items.map((item) => item.label)
      .join(" ")
      .toLowerCase();
    expect(haystack).toMatch(/second descent/);
  });
});
