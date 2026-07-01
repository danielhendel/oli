import { buildBenchPressKeyframeCandidateQaWorksheet } from "../buildBenchPressKeyframeCandidateQaWorksheet";
import { buildCandidateImageQaWorksheet } from "../buildCandidateImageQaWorksheet";
import { LOCAL_IMPORTED_IMAGE_FIXTURE } from "../../candidate-production/fixtures/localImportedImageFixture";
import { buildMediaCandidateFromImageImport } from "../../candidate-production/buildMediaCandidateFromImageImport";

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
