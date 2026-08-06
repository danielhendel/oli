/**
 * De-identified synthetic Quest page texts keyed by collection year for lifecycle tests.
 */
import fs from "fs";
import path from "path";

const FIXTURE_DIR = path.join(__dirname, "../../extraction/__fixtures__");

function loadQuestFixture(name: string): string {
  return fs.readFileSync(path.join(FIXTURE_DIR, `${name}.txt`), "utf8");
}

export type SyntheticQuestPage = { pageNumber: number; text: string };

function pagesFromFixture(name: string): SyntheticQuestPage[] {
  return [{ pageNumber: 1, text: loadQuestFixture(name) }];
}

/** Single-report page texts grouped by collection year (synthetic, no PHI). */
export const MULTI_REPORT_SYNTHETIC_BY_YEAR = {
  2020: {
    basicHealthProfile: pagesFromFixture("quest_2020_basic_health_profile_v1"),
    standard: pagesFromFixture("quest_2020_standard_v1"),
  },
  2021: {
    qualitativeAntibody: pagesFromFixture("quest_2021_qualitative_antibody_v1"),
  },
  2022: {
    standard: pagesFromFixture("quest_2022_standard_v1"),
  },
} as const;

/** Flat list of all synthetic lifecycle reports in chronological order. */
export function allMultiReportSyntheticPages(): SyntheticQuestPage[][] {
  return [
    MULTI_REPORT_SYNTHETIC_BY_YEAR[2020].basicHealthProfile,
    MULTI_REPORT_SYNTHETIC_BY_YEAR[2020].standard,
    MULTI_REPORT_SYNTHETIC_BY_YEAR[2021].qualitativeAntibody,
    MULTI_REPORT_SYNTHETIC_BY_YEAR[2022].standard,
  ];
}
