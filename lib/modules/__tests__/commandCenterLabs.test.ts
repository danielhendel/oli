// lib/modules/__tests__/commandCenterLabs.test.ts
import { buildLabsCommandCenterModel } from "../commandCenterLabs";

describe("buildLabsCommandCenterModel", () => {
  it("returns partial model", () => {
    const m = buildLabsCommandCenterModel({
      dataReadinessState: "partial",
      uploads: null,
      hasFailures: false,
    });

    expect(m.state).toBe("partial");
    expect(m.description).toContain("still building");
    expect(m.latestSummary).toBeNull();
    expect(m.showUploadCta).toBe(false);
    expect(m.showViewCta).toBe(false);
    expect(m.showFailuresCta).toBe(false);
  });

  it("returns error model and failures CTA when failures exist", () => {
    const m = buildLabsCommandCenterModel({
      dataReadinessState: "error",
      uploads: null,
      hasFailures: true,
    });

    expect(m.state).toBe("error");
    expect(m.showFailuresCta).toBe(true);
    expect(m.showUploadCta).toBe(false);
    expect(m.showViewCta).toBe(false);
  });

  it("returns missing model", () => {
    const m = buildLabsCommandCenterModel({
      dataReadinessState: "missing",
      uploads: null,
      hasFailures: false,
    });

    expect(m.state).toBe("missing");
    expect(m.latestSummary).toBeNull();
    expect(m.showUploadCta).toBe(true);
    expect(m.showViewCta).toBe(false);
  });

  it("returns partial model", () => {
    const m = buildLabsCommandCenterModel({
      dataReadinessState: "partial",
      uploads: null,
      hasFailures: false,
    });

    expect(m.state).toBe("partial");
    expect(m.latestSummary).toBeNull();
    expect(m.showUploadCta).toBe(false);
    expect(m.showViewCta).toBe(false);
  });

  it("returns partial (fail closed) when ready but uploads missing", () => {
    const m = buildLabsCommandCenterModel({
      dataReadinessState: "ready",
      uploads: null,
      hasFailures: false,
    });

    expect(m.state).toBe("partial");
    expect(m.description).toContain("Could not load lab uploads presence");
    expect(m.latestSummary).toBeNull();
    expect(m.showUploadCta).toBe(true);
    expect(m.showViewCta).toBe(false);
  });

  it("returns ready with showUploadCta true when count is 0", () => {
    const m = buildLabsCommandCenterModel({
      dataReadinessState: "ready",
      uploads: { count: 0, latest: null },
      hasFailures: false,
    });

    expect(m.state).toBe("ready");
    expect(m.description).toBe("No lab uploads yet");
    expect(m.latestSummary).toBeNull();
    expect(m.showUploadCta).toBe(true);
    expect(m.showViewCta).toBe(true);
  });

  it("returns ready with latest formatting when count > 0", () => {
    const m = buildLabsCommandCenterModel({
      dataReadinessState: "ready",
      uploads: {
        count: 2,
        latest: {
          rawEventId: "idem_1",
          observedAt: "2025-01-15T10:00:00.000Z",
          receivedAt: "2025-01-15T10:00:00.000Z",
          originalFilename: "labs.pdf",
          mimeType: "application/pdf",
        },
      },
      hasFailures: false,
    });

    expect(m.state).toBe("ready");
    expect(m.description).toContain("labs.pdf");
    expect(m.description).toContain("uploaded");
    expect(m.latestSummary).toContain("labs.pdf");
    expect(m.showUploadCta).toBe(false);
    expect(m.showViewCta).toBe(true);
  });

  it("returns ready with uploaded date when latest has no filename", () => {
    const m = buildLabsCommandCenterModel({
      dataReadinessState: "ready",
      uploads: {
        count: 1,
        latest: {
          rawEventId: "idem_1",
          observedAt: "2025-01-15T10:00:00.000Z",
          receivedAt: "2025-01-15T10:00:00.000Z",
        },
      },
      hasFailures: false,
    });

    expect(m.state).toBe("ready");
    expect(m.description).toContain("uploaded");
    expect(m.showUploadCta).toBe(false);
    expect(m.showViewCta).toBe(true);
  });

  it("shows failures CTA when hasFailures is true and state is ready", () => {
    const m = buildLabsCommandCenterModel({
      dataReadinessState: "ready",
      uploads: { count: 0, latest: null },
      hasFailures: true,
    });

    expect(m.state).toBe("ready");
    expect(m.showFailuresCta).toBe(true);
    expect(m.showUploadCta).toBe(true);
    expect(m.showViewCta).toBe(true);
  });
});
