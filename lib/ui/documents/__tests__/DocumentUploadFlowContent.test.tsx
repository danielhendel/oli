import React from "react";
import renderer, { act } from "react-test-renderer";
import { describe, expect, it } from "@jest/globals";
import {
  DOCUMENT_UPLOAD_DISABLED_BG,
  DOCUMENT_UPLOAD_DISABLED_LABEL,
  DOCUMENT_UPLOAD_MIN_TOUCH,
  DOCUMENT_UPLOAD_PRIMARY_BG,
  DOCUMENT_UPLOAD_PRIMARY_LABEL,
  DocumentUploadFlowContent,
} from "../DocumentUploadFlowContent";
import { SYSTEM_ACCENT } from "@/lib/ui/theme/systemAccent";
import { UI_SURFACE_PRESSED, UI_TEXT_MUTED, UI_TEXT_PRIMARY } from "@/lib/ui/theme/uiTokens";

describe("DocumentUploadFlowContent contrast", () => {
  it("uses accent primary surface with high-contrast Choose file label", () => {
    expect(DOCUMENT_UPLOAD_PRIMARY_BG).toBe(SYSTEM_ACCENT);
    expect(DOCUMENT_UPLOAD_PRIMARY_LABEL).toBe("#FFFFFF");
    expect(DOCUMENT_UPLOAD_PRIMARY_BG).not.toBe(UI_TEXT_PRIMARY);
    expect(DOCUMENT_UPLOAD_PRIMARY_BG).not.toBe("#FFFFFF");
    expect(DOCUMENT_UPLOAD_PRIMARY_LABEL).not.toBe(DOCUMENT_UPLOAD_PRIMARY_BG);

    let tree!: renderer.ReactTestRenderer;
    act(() => {
      tree = renderer.create(
        <DocumentUploadFlowContent
          phase="idle"
          errorMessage={null}
          onStart={() => undefined}
          onCancel={() => undefined}
          onReset={() => undefined}
          domainLabel="Labs"
        />,
      );
    });
    const choose = tree.root.findByProps({ testID: "document-upload-choose" });
    expect(choose.props.style({ pressed: false })).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          backgroundColor: DOCUMENT_UPLOAD_PRIMARY_BG,
          minHeight: DOCUMENT_UPLOAD_MIN_TOUCH,
        }),
      ]),
    );
    const label = JSON.stringify(tree.toJSON());
    expect(label).toContain("Choose file");
    expect(label).toContain(DOCUMENT_UPLOAD_PRIMARY_LABEL);
  });

  it("keeps disabled Done readable with muted tokens (not white-on-white)", () => {
    expect(DOCUMENT_UPLOAD_DISABLED_BG).toBe(UI_SURFACE_PRESSED);
    expect(DOCUMENT_UPLOAD_DISABLED_LABEL).toBe(UI_TEXT_MUTED);
    expect(DOCUMENT_UPLOAD_DISABLED_LABEL).not.toBe("#FFFFFF");
    expect(DOCUMENT_UPLOAD_DISABLED_BG).not.toBe("#FFFFFF");
    expect(DOCUMENT_UPLOAD_DISABLED_BG).not.toBe(UI_TEXT_PRIMARY);

    let tree!: renderer.ReactTestRenderer;
    act(() => {
      tree = renderer.create(
        <DocumentUploadFlowContent
          phase="uploading"
          errorMessage={null}
          onStart={() => undefined}
          onCancel={() => undefined}
          onReset={() => undefined}
          domainLabel="Labs"
        />,
      );
    });
    const done = tree.root.findByProps({ testID: "document-upload-done-disabled" });
    expect(done.props.accessibilityState).toEqual({ disabled: true });
    expect(done.props.style).toEqual(
      expect.objectContaining({
        backgroundColor: DOCUMENT_UPLOAD_DISABLED_BG,
        minHeight: DOCUMENT_UPLOAD_MIN_TOUCH,
      }),
    );
    expect(DOCUMENT_UPLOAD_MIN_TOUCH).toBeGreaterThanOrEqual(44);
  });
});
