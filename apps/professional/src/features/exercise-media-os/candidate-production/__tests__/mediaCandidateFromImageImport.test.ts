import { buildCandidateQaScore } from "../../candidate-review/buildCandidateQaScore";
import { buildMediaCandidateFromImageImport } from "../buildMediaCandidateFromImageImport";
import {
  LOCAL_IMPORTED_IMAGE_FIXTURE,
  LOCAL_IMPORTED_IMAGE_FIXTURE_DRAFT,
} from "../fixtures/localImportedImageFixture";

describe("buildMediaCandidateFromImageImport", () => {
  it("draft import creates draft image candidate", () => {
    const { candidate, issues } = buildMediaCandidateFromImageImport(LOCAL_IMPORTED_IMAGE_FIXTURE_DRAFT);
    expect(issues).toHaveLength(0);
    expect(candidate?.status).toBe("draft");
    expect(candidate?.assetType).toBe("image");
  });

  it("dev-test import creates dev-test image candidate", () => {
    const { candidate } = buildMediaCandidateFromImageImport(LOCAL_IMPORTED_IMAGE_FIXTURE);
    expect(candidate?.status).toBe("dev-test");
  });

  it("preserves exerciseId, keyframePoseId, and characterId", () => {
    const { candidate } = buildMediaCandidateFromImageImport(LOCAL_IMPORTED_IMAGE_FIXTURE);
    expect(candidate?.exerciseId).toBe("bench_press");
    expect(candidate?.keyframePoseId).toBe("setup");
    expect(candidate?.characterId).toBe("oli_motion_male_m1");
  });

  it("localAsset.existsInRepo mirrors fileExists", () => {
    const { candidate } = buildMediaCandidateFromImageImport(LOCAL_IMPORTED_IMAGE_FIXTURE);
    expect(candidate?.localAsset.existsInRepo).toBe(true);
    const missing = buildMediaCandidateFromImageImport({
      ...LOCAL_IMPORTED_IMAGE_FIXTURE,
      fileExists: false,
    });
    expect(missing.candidate).toBeNull();
  });

  it("rights default to internal-dev-only and QA is not approval eligible", () => {
    const { candidate } = buildMediaCandidateFromImageImport(LOCAL_IMPORTED_IMAGE_FIXTURE);
    expect(candidate?.rights.usageStatus).toBe("internal-dev-only");
    const qa = buildCandidateQaScore({
      qa: candidate!.qa,
      rights: candidate!.rights,
      status: candidate!.status,
    });
    expect(qa.approvalEligible).toBe(false);
  });

  it("candidate validates with validateMediaCandidate", () => {
    const { candidate, issues } = buildMediaCandidateFromImageImport(LOCAL_IMPORTED_IMAGE_FIXTURE);
    expect(issues).toHaveLength(0);
    expect(candidate).not.toBeNull();
  });

  it("approved-master status cannot be produced by import utility", () => {
    const result = buildMediaCandidateFromImageImport({
      ...LOCAL_IMPORTED_IMAGE_FIXTURE,
      intendedCandidateStatus: "approved-master" as "dev-test",
    });
    expect(result.candidate).toBeNull();
    expect(result.issues.some((issue) => issue.code === "invalid-import-status")).toBe(true);
  });

  it("reviewer notes require human QA before approval", () => {
    const { candidate } = buildMediaCandidateFromImageImport(LOCAL_IMPORTED_IMAGE_FIXTURE);
    expect(
      candidate?.reviewerNotes.some((note) =>
        note.includes("human Oli Media Factory QA before approval"),
      ),
    ).toBe(true);
  });
});
