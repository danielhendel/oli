/**
 * Locks PDFKit viewer chrome contract + EXConstants native linkage (no XCTest target).
 * Reads committed Swift / Podfile.lock sources — never personal PDFs.
 */

import fs from "node:fs";
import path from "node:path";

import { describe, expect, it } from "@jest/globals";

const repoRoot = path.resolve(__dirname, "../../../..");
const chromeSwift = path.join(
  repoRoot,
  "modules/oli-secure-pdf-preview/ios/OliSecurePdfViewerChrome.swift",
);
const viewControllerSwift = path.join(
  repoRoot,
  "modules/oli-secure-pdf-preview/ios/OliSecurePdfViewController.swift",
);
const podfileLock = path.join(repoRoot, "ios/Podfile.lock");
const packageJson = path.join(repoRoot, "package.json");
const pbxproj = path.join(repoRoot, "ios/Oli.xcodeproj/project.pbxproj");

describe("OliSecurePdfViewerChrome contract", () => {
  it("uses forced dark UI style and semantic high-contrast chrome colors", () => {
    const src = fs.readFileSync(chromeSwift, "utf8");
    expect(src).toContain("forcedUserInterfaceStyle: UIUserInterfaceStyle = .dark");
    expect(src).toContain(".secondarySystemBackground");
    expect(src).toContain("UIColor.label");
    expect(src).toContain(".systemBlue");
    expect(src).toContain('closeButtonTitle = "Close"');
    expect(src).toContain('closeAccessibilityLabel = "Close original report"');
    expect(src).toContain("minimumCloseTargetPoints: CGFloat = 44");
    // No hard-coded white/black label pairs that break one appearance mode.
    expect(src).not.toMatch(/foregroundColor:\s*UIColor\.black/);
    expect(src).not.toMatch(/foregroundColor:\s*UIColor\(white:\s*0/);
  });

  it("wires chrome into the view controller without share/export controls", () => {
    const src = fs.readFileSync(viewControllerSwift, "utf8");
    expect(src).toContain("OliSecurePdfViewerChrome.forcedUserInterfaceStyle");
    expect(src).toContain("makeCloseBarButtonItem");
    expect(src).toContain("makeNavigationBarAppearance");
    expect(src).not.toContain("UIActivityViewController");
    expect(src).not.toContain("UIDocumentInteractionController");
    expect(src).not.toMatch(/\bUIActivityViewController\b|\bUIDocumentInteractionController\b/);
    expect(src).toContain("canPerformAction");
    expect(src).toContain("return false");
    // Export surfaces remain blocked (comment + fail-closed selectors).
    expect(src).toMatch(/Block share|no share|fail closed for export/i);
  });
});

describe("EXConstants native linkage", () => {
  it("declares Expo SDK-compatible expo-constants as a direct dependency", () => {
    const pkg = JSON.parse(fs.readFileSync(packageJson, "utf8")) as {
      dependencies?: Record<string, string>;
    };
    expect(pkg.dependencies?.["expo-constants"]).toMatch(/^~17\.1\./);
  });

  it("links EXConstants in Podfile.lock alongside OliSecurePdfPreview", () => {
    const lock = fs.readFileSync(podfileLock, "utf8");
    expect(lock).toMatch(/- EXConstants \(17\.1\./);
    expect(lock).toContain("EXConstants (from `../node_modules/expo-constants/ios`)");
    expect(lock).toContain("OliSecurePdfPreview (from `../modules/oli-secure-pdf-preview/ios`)");
    // Must not accidentally lock the iOS-16.4-only Expo 54+/56 constants pod.
    expect(lock).not.toMatch(/- EXConstants \(56\./);
  });

  it("copies EXConstants resource bundles in the app pbxproj", () => {
    const proj = fs.readFileSync(pbxproj, "utf8");
    expect(proj).toContain("EXConstants/EXConstants.bundle");
    expect(proj).toContain("EXConstants/ExpoConstants_privacy.bundle");
  });
});
