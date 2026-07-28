import { describe, expect, it } from "@jest/globals";
import {
  resolveWithingsConnectionTruth,
  withingsDisplayLabelIsHonest,
} from "../withingsConnectionTruth";
import { filterToAppleHealthBodyReadSources } from "@/lib/data/body/sourceFiltering";

describe("withingsConnectionTruth", () => {
  it("never returns Connected when live sync is unsupported", () => {
    const connectedFlag = resolveWithingsConnectionTruth({
      firestoreConnectedFlag: true,
      liveSyncSupported: false,
    });
    expect(connectedFlag.label).not.toBe("Connected");
    expect(connectedFlag.displayStatus).toBe("previously_connected");
    expect(connectedFlag.includeInCurrentState).toBe(false);
    expect(connectedFlag.preserveHistorical).toBe(true);
  });

  it("uses connection unavailable when no historical proof exists", () => {
    const truth = resolveWithingsConnectionTruth({
      firestoreConnectedFlag: false,
      hasHistoricalRawEvents: false,
    });
    expect(truth.displayStatus).toBe("connection_unavailable");
    expect(withingsDisplayLabelIsHonest(truth.label)).toBe(true);
  });

  it("rejects Connected as an honest label", () => {
    expect(withingsDisplayLabelIsHonest("Connected")).toBe(false);
    expect(withingsDisplayLabelIsHonest("Previously connected")).toBe(true);
  });

  it("keeps Withings rows out of current body state filters", () => {
    const rows = [
      { sourceId: "withings", id: "a" },
      { sourceId: "apple_health", id: "b" },
    ];
    expect(filterToAppleHealthBodyReadSources(rows)).toEqual([{ sourceId: "apple_health", id: "b" }]);
  });
});
