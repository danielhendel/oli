import fs from "fs";
import path from "path";

import { DOCUMENT_PICKER_UNAVAILABLE_MESSAGE } from "@/lib/labs/expoDocumentPicker";

describe("expoDocumentPicker", () => {
  it("does not top-level import expo-document-picker in labs upload modules", () => {
    const repoRoot = path.resolve(__dirname, "../../..");
    const files = [
      "lib/labs/expoDocumentPicker.ts",
      "lib/data/labs/useLabUploadFlow.ts",
      "app/(app)/labs/upload.tsx",
    ];

    for (const relativePath of files) {
      const content = fs.readFileSync(path.join(repoRoot, relativePath), "utf8");
      expect(content).not.toMatch(/^import\s+(?!type)[^;]*from\s+["']expo-document-picker["']/m);
      expect(content).not.toMatch(/^import\s+\*\s+as\s+[^;]+from\s+["']expo-document-picker["']/m);
    }
  });

  it("uses the rebuild fallback copy", () => {
    expect(DOCUMENT_PICKER_UNAVAILABLE_MESSAGE).toContain("development build");
  });
});
