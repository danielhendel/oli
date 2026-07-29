import { describe, expect, it } from "@jest/globals";
import { buildUserDataInventoryViewModel } from "../buildUserDataInventoryViewModel";

describe("buildUserDataInventoryViewModel", () => {
  it("builds user-facing rows without collection names or private values", () => {
    const vm = buildUserDataInventoryViewModel({
      authPresent: true,
      ouraConnected: true,
      appleHealthConnected: false,
      labUploadCountCategory: "some",
      labsStructuredExtractionAvailable: false,
      withingsFirestoreConnectedFlag: true,
    });

    const blob = JSON.stringify(vm);
    expect(blob).not.toMatch(/users\/\{uid\}|labUploads|rawEvents|Firestore/);
    expect(blob).not.toMatch(/LDL|HDL|mg\/dL|Bearer /i);

    expect(vm.sourceRows.some((r) => r.title === "Withings")).toBe(true);
    expect(vm.sourceRows.find((r) => r.title === "Withings")?.statusChip).not.toBe("Connected");
    expect(vm.recordRows.find((r) => r.id === "labs")?.statusChip).toBe("Stored, not structured");
    expect(vm.recordRows.find((r) => r.id === "scans")?.statusChip).toBe("Not set up");
    expect(vm.privacy.exportCoverageComplete).toBe(false);
    expect(vm.privacy.deleteCoverageComplete).toBe(false);
  });
});
