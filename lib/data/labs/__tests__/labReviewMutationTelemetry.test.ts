/**
 * Safe Labs mutation telemetry must never carry analyte/values.
 */
import {
  emitLabReviewMutationTelemetry,
  redactLabsToken,
  LAB_REVIEW_MUTATION_TELEMETRY_LOG_LABEL,
} from "@/lib/data/labs/labReviewMutationTelemetry";

describe("labReviewMutationTelemetry", () => {
  it("redacts ids to opaque tokens", () => {
    const a = redactLabsToken("cand_abc123");
    const b = redactLabsToken("cand_abc123");
    expect(a).toBe(b);
    expect(a).not.toContain("cand_abc123");
    expect(a.startsWith("t_")).toBe(true);
  });

  it("emits only safe fields", () => {
    const spy = jest.spyOn(console, "info").mockImplementation(() => undefined);
    emitLabReviewMutationTelemetry({
      operation: "lab_review_candidate_action_completed",
      documentToken: redactLabsToken("doc_1"),
      candidateToken: redactLabsToken("cand_1"),
      action: "accept",
      priorStatus: "pending_review",
      nextStatus: "user_accepted",
      httpStatus: 200,
      reviewVersion: 1,
      elapsedMs: 12,
    });
    expect(spy).toHaveBeenCalledWith(
      LAB_REVIEW_MUTATION_TELEMETRY_LOG_LABEL,
      expect.objectContaining({
        operation: "lab_review_candidate_action_completed",
        action: "accept",
        nextStatus: "user_accepted",
      }),
    );
    const payload = JSON.stringify(spy.mock.calls[0]);
    expect(payload).not.toMatch(/glucose|mg\/dL|92|analyte/i);
    spy.mockRestore();
  });
});
