import { describe, expect, it } from "@jest/globals";
import { buildProfileCompleteness } from "../buildProfileCompleteness";
import { buildUserProfileGraph } from "../buildUserProfileGraph";

describe("buildProfileCompleteness", () => {
  it("does not count placeholders as complete", () => {
    const graph = buildUserProfileGraph({
      authPresent: true,
      dateOfBirthPresent: true,
      sexAtBirthPresent: true,
      heightPresent: true,
      preferredUnitsPresent: true,
      ouraConnected: true,
      appleHealthConnected: true,
    });
    const summary = buildProfileCompleteness(graph);
    const health = summary.sections.find((s) => s.sectionId === "health_history");
    expect(health).toBeDefined();
    expect(health!.placeholderCount).toBeGreaterThan(0);
    expect(health!.complete).toBe(false);
  });

  it("does not treat orphaned Withings as a completed device source", () => {
    const graph = buildUserProfileGraph({
      authPresent: true,
      ouraConnected: true,
      appleHealthConnected: true,
      withingsFirestoreConnectedFlag: true,
    });
    const devices = buildProfileCompleteness(graph).sections.find((s) => s.sectionId === "device_sources");
    expect(devices!.staleCount).toBeGreaterThan(0);
    expect(devices!.complete).toBe(false);
  });

  it("identifies unsupported labs extraction in records section gaps", () => {
    const graph = buildUserProfileGraph({
      authPresent: true,
      labUploadCountCategory: "some",
      labsStructuredExtractionAvailable: false,
    });
    const records = buildProfileCompleteness(graph).sections.find((s) => s.sectionId === "records");
    expect(records!.complete).toBe(false);
    expect(records!.primaryGaps.length).toBeGreaterThan(0);
  });

  it("produces deterministic section totals", () => {
    const input = {
      authPresent: true,
      dateOfBirthPresent: false,
      sexAtBirthPresent: false,
      heightPresent: false,
      preferredUnitsPresent: false,
      ouraConnected: false,
      appleHealthConnected: false,
      labUploadCountCategory: "none" as const,
    };
    const a = buildProfileCompleteness(buildUserProfileGraph(input));
    const b = buildProfileCompleteness(buildUserProfileGraph(input));
    expect(a).toEqual(b);
    for (const section of a.sections) {
      expect(section.presentFieldCount).toBeLessThanOrEqual(section.requiredFieldCount);
    }
  });

  it("does not invent a vanity overall score", () => {
    const summary = buildProfileCompleteness(buildUserProfileGraph({ authPresent: true }));
    expect(Object.keys(summary)).toEqual(["sections"]);
  });
});
