/**
 * Storage Model A — deny-all client access (Document Ingestion OS).
 * Static contract test (Storage emulator is not started by the default Jest harness).
 */
import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "@jest/globals";
import { DOCUMENT_STORAGE_RULES_SOURCE } from "../../../../../lib/data/documents/documentStorageRulesSource";

const RULES_PATH = path.resolve(process.cwd(), "storage.rules");

describe("Firebase Storage security rules source (Document OS Model A)", () => {
  it("ships deny-all rules wired for deployment", () => {
    const onDisk = fs.readFileSync(RULES_PATH, "utf8");
    expect(onDisk).toContain("allow read, write: if false");
    expect(onDisk).toContain("service firebase.storage");
    expect(onDisk.replace(/\s+/g, " ").trim()).toBe(
      DOCUMENT_STORAGE_RULES_SOURCE.replace(/\s+/g, " ").trim(),
    );
  });

  it("does not grant authenticated or public client Storage access", () => {
    const onDisk = fs.readFileSync(RULES_PATH, "utf8");
    expect(onDisk).not.toMatch(/allow\s+read\s*:\s*if\s+request\.auth/);
    expect(onDisk).not.toMatch(/allow\s+write\s*:\s*if\s+request\.auth/);
    expect(onDisk).not.toMatch(/allow\s+read,\s*write\s*:\s*if\s+true/);
  });
});
