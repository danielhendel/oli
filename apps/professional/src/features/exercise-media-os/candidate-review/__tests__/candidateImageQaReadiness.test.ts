import { buildCandidateImageQaReadiness } from "../buildCandidateImageQaReadiness";
import { buildBenchPressKeyframeCandidateQaWorksheet } from "../buildBenchPressKeyframeCandidateQaWorksheet";
import { buildCandidateImageQaWorksheet } from "../buildCandidateImageQaWorksheet";
import { LOCAL_IMPORTED_IMAGE_FIXTURE } from "../../candidate-production/fixtures/localImportedImageFixture";
import { buildMediaCandidateFromImageImport } from "../../candidate-production/buildMediaCandidateFromImageImport";

describe("buildCandidateImageQaReadiness", () => {
  const { candidate } = buildMediaCandidateFromImageImport(LOCAL_IMPORTED_IMAGE_FIXTURE);

  it("missing candidate => missing", () => {
    const readiness = buildCandidateImageQaReadiness({ candidate: null, worksheet: null });
    expect(readiness.readinessLabel).toBe("missing");
    expect(readiness.approvalEligible).toBe(false);
  });

  it("imported dev-test candidate => needs-human-review or dev-test", () => {
    const worksheet = buildBenchPressKeyframeCandidateQaWorksheet(candidate!);
    const readiness = buildCandidateImageQaReadiness({ candidate, worksheet });
    expect(["needs-human-review", "dev-test"]).toContain(readiness.readinessLabel);
    expect(readiness.approvalEligible).toBe(false);
  });

  it("internal-dev-only rights block eligible-for-master-review", () => {
    const worksheet = buildCandidateImageQaWorksheet({
      exerciseId: candidate!.exerciseId,
      candidateId: candidate!.candidateId,
      renderTarget: "16:9",
    });
    const readiness = buildCandidateImageQaReadiness({ candidate, worksheet });
    expect(readiness.readinessLabel).not.toBe("eligible-for-master-review");
    expect(readiness.blockedReasons.some((reason) => reason.includes("internal-dev-only"))).toBe(
      true,
    );
  });

  it("not-reviewed worksheet blocks eligible-for-master-review", () => {
    const worksheet = buildCandidateImageQaWorksheet({
      exerciseId: candidate!.exerciseId,
      candidateId: candidate!.candidateId,
      renderTarget: "16:9",
    });
    const readiness = buildCandidateImageQaReadiness({ candidate, worksheet });
    expect(readiness.blockedReasons.some((reason) => reason.includes("not-reviewed"))).toBe(true);
  });

  it("watermark finding blocks eligibility", () => {
    const watermarked = {
      ...candidate!,
      rights: { ...candidate!.rights, containsWatermark: true },
    };
    const worksheet = buildBenchPressKeyframeCandidateQaWorksheet(watermarked);
    const readiness = buildCandidateImageQaReadiness({ candidate: watermarked, worksheet });
    expect(readiness.approvalEligible).toBe(false);
    expect(readiness.blockedReasons.some((reason) => reason.includes("Watermark"))).toBe(true);
  });

  it("readiness label is never approved-master", () => {
    const worksheet = buildBenchPressKeyframeCandidateQaWorksheet(candidate!);
    const readiness = buildCandidateImageQaReadiness({ candidate, worksheet });
    expect(readiness.readinessLabel).not.toBe("approved-master" as never);
    const allowedLabels = [
      "missing",
      "needs-human-review",
      "dev-test",
      "needs-revision",
      "rejected",
      "eligible-for-master-review",
    ];
    expect(allowedLabels).toContain(readiness.readinessLabel);
  });
});
