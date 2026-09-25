/**
 * Fixture policy.
 *
 * Body Scan reports are among the most identifying documents a person can upload, so no
 * real report — and nothing that reads like one — may ever be committed. This test fails
 * the build if a PDF appears in the repository, or if a fixture picks up the identifiers
 * that appear on a genuine scan printout.
 */

import fs from "node:fs";
import path from "node:path";

const REPO_ROOT = path.resolve(__dirname, "../../../..");

const SKIPPED_DIRECTORIES = new Set([
  ".git",
  ".expo",
  "node_modules",
  "dist",
  "dist-types",
  "build",
  "coverage",
  "ios",
  "android",
]);

/** Build output directories that happen to share a name with real source trees. */
const SKIPPED_PATHS = new Set(["services/functions/lib"]);

const FIXTURE_DIRECTORY_PATTERN = /(__fixtures__|fixtures|__mocks__)$/;
const TEXT_FIXTURE_EXTENSIONS = new Set([".ts", ".tsx", ".json", ".txt", ".csv", ".md"]);

/**
 * Pre-existing Labs fixtures, which carry their own synthetic-report policy from Stage 3D.
 * Nothing may be added here; a new domain's fixtures are covered by the rules below.
 */
const LEGACY_FIXTURE_EXEMPTIONS = new Set([
  "lib/labs/extraction/__fixtures__/quest_synthetic_lifecycle_v1.pdf",
  "lib/labs/extraction/__fixtures__/quest_2020_basic_health_profile_v1.txt",
  "lib/labs/extraction/__fixtures__/quest_2020_basic_health_profile_fragmented_v1.txt",
]);

/** Identifiers printed on a real scan or lab report. None of these belong in a fixture. */
const PHI_MARKERS: readonly { label: string; pattern: RegExp }[] = [
  { label: "medical record number", pattern: /\bmrn\b|medical\s+record\s+number/i },
  { label: "date of birth", pattern: /\bdate\s+of\s+birth\b|\bd\.?o\.?b\.?\s*[:#]/i },
  { label: "social security number", pattern: /\bssn\b|social\s+security/i },
  { label: "patient identifier", pattern: /\bpatient\s+(name|id|identifier)\b/i },
  { label: "accession number", pattern: /\baccession\b/i },
  { label: "referring physician", pattern: /referring\s+(physician|provider|doctor)/i },
  { label: "email address", pattern: /[\w.+-]+@[\w-]+\.[a-z]{2,}/i },
  { label: "phone number", pattern: /\(\d{3}\)\s*\d{3}-\d{4}|\b\d{3}-\d{3}-\d{4}\b/ },
];

function walk(dir: string, onFile: (absolutePath: string) => void): void {
  let entries: fs.Dirent[];
  try {
    entries = fs.readdirSync(dir, { withFileTypes: true });
  } catch {
    return;
  }
  for (const entry of entries) {
    const absolutePath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (SKIPPED_DIRECTORIES.has(entry.name)) continue;
      if (SKIPPED_PATHS.has(path.relative(REPO_ROOT, absolutePath))) continue;
      walk(absolutePath, onFile);
      continue;
    }
    if (entry.isFile()) onFile(absolutePath);
  }
}

function relative(absolutePath: string): string {
  return path.relative(REPO_ROOT, absolutePath);
}

describe("fixture policy", () => {
  const allFiles: string[] = [];
  beforeAll(() => {
    walk(REPO_ROOT, (file) => allFiles.push(file));
  });

  it("never commits a PDF anywhere in the repository", () => {
    const pdfs = allFiles
      .filter((file) => file.toLowerCase().endsWith(".pdf"))
      .map(relative)
      .filter((file) => !LEGACY_FIXTURE_EXEMPTIONS.has(file));
    expect(pdfs).toEqual([]);
  });

  it("keeps report identifiers out of every fixture", () => {
    const offenders: string[] = [];
    for (const file of allFiles) {
      const dirName = path.basename(path.dirname(file));
      if (!FIXTURE_DIRECTORY_PATTERN.test(dirName)) continue;
      if (!TEXT_FIXTURE_EXTENSIONS.has(path.extname(file))) continue;
      if (LEGACY_FIXTURE_EXEMPTIONS.has(relative(file))) continue;

      const contents = fs.readFileSync(file, "utf8");
      for (const marker of PHI_MARKERS) {
        if (marker.pattern.test(contents)) {
          offenders.push(`${relative(file)} contains ${marker.label}`);
        }
      }
    }
    expect(offenders).toEqual([]);
  });

  it("states in the Body Scan fixture that its values are invented", () => {
    const fixture = fs.readFileSync(
      path.join(REPO_ROOT, "lib/data/body-scans/__fixtures__/liveLeanRxDxaSynthetic.ts"),
      "utf8",
    );
    expect(fixture).toMatch(/FIXTURE POLICY/);
    expect(fixture).toMatch(/every value here is invented/i);
  });
});
