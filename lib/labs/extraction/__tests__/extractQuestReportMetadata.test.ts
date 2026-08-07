import { describe, expect, it } from "@jest/globals";
import {
  extractCollectedDateRaw,
  extractQuestReportMetadata,
} from "../extractQuestReportMetadata";

describe("extractCollectedDateRaw", () => {
  it("prefers Collected Date on a DOB-combined metadata line", () => {
    const raw = extractCollectedDateRaw([
      "DOB: 01/01/1990 | Sex: M | Specimen: SERUM | Collected Date: 06/05/2020",
    ]);
    expect(raw).toBe("06/05/2020");
  });

  it("never returns DOB as collected date", () => {
    const raw = extractCollectedDateRaw(["DOB: 08/09/1978 | Collected Date: 06/05/2020"]);
    expect(raw).toBe("06/05/2020");
    expect(raw).not.toMatch(/1978/);
  });

  it("uses standalone Collected: when present", () => {
    const raw = extractCollectedDateRaw(["Collected: 06/05/2020 08:00 AM"]);
    expect(raw).toBe("06/05/2020 08:00 AM");
  });

  it("rejects dates anchored to DOB label without Collected Date", () => {
    const raw = extractCollectedDateRaw(["DOB: 08/09/1978 | Sex: M"]);
    expect(raw).toBeNull();
  });
});

describe("extractQuestReportMetadata collectedAt", () => {
  it("maps combined DOB + Collected Date line to 2020-06-05", () => {
    const meta = extractQuestReportMetadata({
      metadataLines: [
        "DOB: 01/01/1990 | Sex: M | Specimen: SERUM | Collected Date: 06/05/2020",
        "Received: 06/05/2020 02:00 PM",
        "Reported: 06/06/2020 09:00 AM",
        "Fasting: Yes",
      ],
      panelNames: ["BASIC HEALTH PROFILE"],
      pageCount: 1,
      formatFamily: "quest_text_pdf_v1",
      formatFamilyVersion: "1.0.0",
      confidence: 0.95,
    });
    expect(meta.collectedAtSource?.sourceCalendarDate).toBe("2020-06-05");
    expect(meta.collectedAt?.startsWith("2020-06-05")).toBe(true);
  });
});
