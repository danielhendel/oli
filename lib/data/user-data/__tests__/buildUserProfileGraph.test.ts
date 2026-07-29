import { describe, expect, it } from "@jest/globals";
import { buildUserProfileGraph } from "../buildUserProfileGraph";

describe("buildUserProfileGraph", () => {
  it("attaches provenance and represents missing / orphaned / unsupported states", () => {
    const graph = buildUserProfileGraph({
      authPresent: true,
      dateOfBirthPresent: false,
      ouraConnected: true,
      appleHealthConnected: false,
      labUploadCountCategory: "some",
      labsStructuredExtractionAvailable: false,
      withingsFirestoreConnectedFlag: true,
      withingsHasHistoricalRawEvents: true,
      nowIso: "2026-07-28T12:00:00.000Z",
    });

    expect(graph.facts.every((f) => f.provenanceSummary.length > 0)).toBe(true);
    expect(graph.facts.find((f) => f.factId === "date_of_birth_present")?.issues.some((i) => i.status === "missing")).toBe(
      true,
    );
    expect(graph.facts.find((f) => f.factId === "withings_connection")?.issues.some((i) => i.status === "orphaned")).toBe(
      true,
    );
    expect(graph.facts.find((f) => f.factId === "lab_upload_count_category")?.issues.some((i) => i.status === "unsupported")).toBe(
      true,
    );
  });

  it("never embeds raw health values in facts", () => {
    const graph = buildUserProfileGraph({
      authPresent: true,
      labUploadCountCategory: "some",
    });
    const blob = JSON.stringify(graph);
    expect(blob).not.toMatch(/LDL|HDL|HbA1c|mg\/dL|"weight":\s*\d/i);
    expect(blob).not.toMatch(/Bearer |token|ya29\./i);
  });

  it("represents Withings honestly and excludes it from current product truth sources", () => {
    const graph = buildUserProfileGraph({
      authPresent: true,
      withingsFirestoreConnectedFlag: true,
    });
    expect(graph.withings.label).not.toBe("Connected");
    expect(graph.withings.includeInCurrentState).toBe(false);
    expect(graph.withings.preserveHistorical).toBe(true);
    const withingsSource = graph.sources.find((s) => s.sourceId === "withings");
    expect(withingsSource?.statusLabel).toBe(graph.withings.label);
    expect(withingsSource?.currentProductTruth).toBe(false);
  });

  it("marks placeholder record domains as not implemented (not empty records)", () => {
    const graph = buildUserProfileGraph({ authPresent: true });
    for (const domainId of ["scans", "medical_history", "medications", "supplements", "dna"] as const) {
      const row = graph.records.find((r) => r.domainId === domainId);
      expect(row?.recordState).toBe("not_implemented");
      expect(row?.statusLabel).toMatch(/Not set up/i);
    }
  });

  it("keeps user isolation by accepting only caller-provided auth presence", () => {
    const a = buildUserProfileGraph({ authPresent: true });
    const b = buildUserProfileGraph({ authPresent: false });
    expect(a.facts.find((f) => f.factId === "auth_uid_present")?.valueAvailability).toBe("available");
    expect(b.facts.find((f) => f.factId === "auth_uid_present")?.valueAvailability).toBe("unavailable");
  });

  it("surfaces export/delete coverage gaps without claiming completeness", () => {
    const graph = buildUserProfileGraph({ authPresent: true });
    expect(graph.exportCoverageComplete).toBe(false);
    expect(graph.deleteCoverageComplete).toBe(false);
    expect(graph.exportGapCount).toBeGreaterThan(0);
    expect(graph.deleteGapCount).toBeGreaterThan(0);
  });
});
