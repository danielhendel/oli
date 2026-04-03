import { describe, expect, it } from "@jest/globals";
import { bodyAppleHealthPersistedPipelineEvidence } from "../appleHealthBodyPersistedEvidence";

describe("bodyAppleHealthPersistedPipelineEvidence", () => {
  it("is true when appleHealthConnected flag is set", () => {
    expect(
      bodyAppleHealthPersistedPipelineEvidence({
        appleHealthConnected: true,
        bodyLastCheckedAt: null,
        backfill: null,
      }),
    ).toBe(true);
  });

  it("is true when body last checked timestamp exists", () => {
    expect(
      bodyAppleHealthPersistedPipelineEvidence({
        appleHealthConnected: false,
        bodyLastCheckedAt: "2026-01-01T00:00:00.000Z",
        backfill: null,
      }),
    ).toBe(true);
  });

  it("is true when backfill state is completed", () => {
    expect(
      bodyAppleHealthPersistedPipelineEvidence({
        appleHealthConnected: false,
        bodyLastCheckedAt: null,
        backfill: {
          status: "completed",
          backfillStartDate: "",
          targetStartDate: "",
          lastProcessedDate: null,
          lastRunAt: "",
          summary: {
            startedAt: "",
            completedAt: "",
            chunkCount: 0,
            samplesRead: 0,
            samplesIngested: 0,
            samplesSkippedDuplicate: 0,
            lastProcessedDate: null,
          },
          error: null,
        },
      }),
    ).toBe(true);
  });

  it("is false when nothing indicates prior pipeline activity", () => {
    expect(
      bodyAppleHealthPersistedPipelineEvidence({
        appleHealthConnected: false,
        bodyLastCheckedAt: null,
        backfill: null,
      }),
    ).toBe(false);
  });
});
