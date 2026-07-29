import { describe, expect, it } from "@jest/globals";
import type { DocumentIngestionJobState } from "@/lib/contracts";
import {
  assertDocumentIngestionTransition,
  documentRecordStatusFromJobState,
  isTerminalDocumentIngestionState,
  transitionDocumentIngestionJobState,
} from "../documentStateMachine";

describe("transitionDocumentIngestionJobState", () => {
  it("allows the happy-path upload and extraction transitions", () => {
    const path: [DocumentIngestionJobState, DocumentIngestionJobState][] = [
      ["created", "validating"],
      ["validating", "storing"],
      ["storing", "stored"],
      ["stored", "classifying"],
      ["classifying", "extraction_queued"],
      ["extraction_queued", "extracting"],
      ["extracting", "extracted"],
      ["extracted", "validation_pending"],
      ["validation_pending", "review_needed"],
      ["review_needed", "accepted"],
      ["accepted", "completed"],
    ];
    for (const [from, to] of path) {
      expect(transitionDocumentIngestionJobState(from, to)).toEqual({ ok: true, from, to });
    }
  });

  it("rejects invalid transitions", () => {
    expect(transitionDocumentIngestionJobState("created", "completed")).toEqual({
      ok: false,
      from: "created",
      to: "completed",
      reason: "invalid_transition",
    });
    expect(transitionDocumentIngestionJobState("cancelled", "validating")).toEqual({
      ok: false,
      from: "cancelled",
      to: "validating",
      reason: "invalid_transition",
    });
    expect(transitionDocumentIngestionJobState("extracting", "accepted")).toEqual({
      ok: false,
      from: "extracting",
      to: "accepted",
      reason: "invalid_transition",
    });
  });

  it("treats same-state as idempotent noop", () => {
    expect(transitionDocumentIngestionJobState("stored", "stored")).toEqual({
      ok: false,
      from: "stored",
      to: "stored",
      reason: "idempotent_noop",
    });
    expect(transitionDocumentIngestionJobState("completed", "completed")).toEqual({
      ok: false,
      from: "completed",
      to: "completed",
      reason: "idempotent_noop",
    });
  });

  it("allows retry from extraction_failed and extraction_unsupported", () => {
    expect(transitionDocumentIngestionJobState("extraction_failed", "extraction_queued")).toEqual({
      ok: true,
      from: "extraction_failed",
      to: "extraction_queued",
    });
    expect(
      transitionDocumentIngestionJobState("extraction_unsupported", "extraction_queued"),
    ).toEqual({
      ok: true,
      from: "extraction_unsupported",
      to: "extraction_queued",
    });
    expect(transitionDocumentIngestionJobState("review_needed", "extraction_queued")).toEqual({
      ok: true,
      from: "review_needed",
      to: "extraction_queued",
    });
    expect(transitionDocumentIngestionJobState("completed", "extraction_queued")).toEqual({
      ok: true,
      from: "completed",
      to: "extraction_queued",
    });
  });

  it("allows cancellation from in-flight states and forbids leaving cancelled", () => {
    for (const from of [
      "created",
      "validating",
      "storing",
      "stored",
      "classifying",
      "extraction_queued",
      "extracting",
      "extracted",
      "review_needed",
      "accepted",
    ] as const) {
      expect(transitionDocumentIngestionJobState(from, "cancelled").ok).toBe(true);
    }
    expect(transitionDocumentIngestionJobState("cancelled", "completed").ok).toBe(false);
  });

  it("allows completion from accepted and unsupported extraction", () => {
    expect(transitionDocumentIngestionJobState("accepted", "completed")).toEqual({
      ok: true,
      from: "accepted",
      to: "completed",
    });
    expect(transitionDocumentIngestionJobState("extraction_unsupported", "completed")).toEqual({
      ok: true,
      from: "extraction_unsupported",
      to: "completed",
    });
  });

  it("throws only on invalid transitions via assertDocumentIngestionTransition", () => {
    expect(() => assertDocumentIngestionTransition("created", "completed")).toThrow(
      /Invalid document ingestion transition/,
    );
    expect(() => assertDocumentIngestionTransition("stored", "stored")).not.toThrow();
    expect(() => assertDocumentIngestionTransition("stored", "classifying")).not.toThrow();
  });
});

describe("documentRecordStatusFromJobState", () => {
  it("maps job states onto consumer record statuses", () => {
    expect(documentRecordStatusFromJobState("created")).toBe("uploading");
    expect(documentRecordStatusFromJobState("validating")).toBe("uploading");
    expect(documentRecordStatusFromJobState("storing")).toBe("uploading");
    expect(documentRecordStatusFromJobState("validation_failed")).toBe("failed");
    expect(documentRecordStatusFromJobState("stored")).toBe("stored");
    expect(documentRecordStatusFromJobState("classifying")).toBe("processing");
    expect(documentRecordStatusFromJobState("extraction_queued")).toBe("processing");
    expect(documentRecordStatusFromJobState("extracting")).toBe("processing");
    expect(documentRecordStatusFromJobState("validation_pending")).toBe("processing");
    expect(documentRecordStatusFromJobState("extraction_failed")).toBe("failed");
    expect(documentRecordStatusFromJobState("cancelled")).toBe("failed");
    expect(documentRecordStatusFromJobState("extraction_unsupported")).toBe("unsupported");
    expect(documentRecordStatusFromJobState("completed")).toBe("unsupported");
    expect(documentRecordStatusFromJobState("extracted")).toBe("review_needed");
    expect(documentRecordStatusFromJobState("review_needed")).toBe("review_needed");
    expect(documentRecordStatusFromJobState("accepted")).toBe("structured");
  });
});

describe("isTerminalDocumentIngestionState", () => {
  it("marks terminal and non-terminal states correctly", () => {
    expect(isTerminalDocumentIngestionState("completed")).toBe(true);
    expect(isTerminalDocumentIngestionState("cancelled")).toBe(true);
    expect(isTerminalDocumentIngestionState("validation_failed")).toBe(true);
    expect(isTerminalDocumentIngestionState("extraction_failed")).toBe(true);
    expect(isTerminalDocumentIngestionState("extraction_unsupported")).toBe(true);
    expect(isTerminalDocumentIngestionState("extracting")).toBe(false);
    expect(isTerminalDocumentIngestionState("review_needed")).toBe(false);
  });
});
