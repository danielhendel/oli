import { jsx as _jsx } from "react/jsx-runtime";
// components/failures/__tests__/FailureList.test.tsx
//
// Sprint 1.2: Proves the failures UI renders a mocked failure and details.
// Follows lib/ui/__tests__/ProvenanceRow.test.tsx pattern.
// @ts-nocheck — react-test-renderer has no types; test file excluded from app tsconfig.
/* eslint-disable @typescript-eslint/ban-ts-comment */
import { act } from "react";
import renderer from "react-test-renderer";
jest.mock("react-native", () => ({
    View: "View",
    Text: "Text",
    Pressable: "Pressable",
    Modal: "Modal",
    ScrollView: "ScrollView",
    StyleSheet: {
        create: (styles) => styles,
    },
}));
// eslint-disable-next-line @typescript-eslint/no-var-requires
const { FailureList } = require("../FailureList");
// eslint-disable-next-line @typescript-eslint/no-var-requires
const { FailureDetailsModal } = require("../FailureDetailsModal");
const MOCK_FAILURE = {
    id: "test_failure_001",
    type: "normalization",
    code: "RAW_EVENT_INVALID",
    message: "RawEvent failed contract validation",
    day: "2025-01-15",
    createdAt: "2025-01-15T12:00:00.000Z",
    rawEventId: "raw_test_1",
    details: { formErrors: ["test proof"], fieldErrors: {} },
};
function collectAllText(test) {
    const nodes = test.root.findAllByType("Text");
    const parts = [];
    for (const n of nodes) {
        for (const child of n.children) {
            if (typeof child === "string" || typeof child === "number")
                parts.push(String(child));
        }
    }
    return parts.join(" ");
}
describe("FailureList", () => {
    it("renders empty state when no failures", () => {
        let test;
        act(() => {
            test = renderer.create(_jsx(FailureList, { items: [] }));
        });
        const text = collectAllText(test);
        expect(text).toContain("No failures recorded");
    });
    it("renders mocked failure with code, message, and source", () => {
        let test;
        act(() => {
            test = renderer.create(_jsx(FailureList, { items: [MOCK_FAILURE] }));
        });
        const text = collectAllText(test);
        expect(text).toContain("Failed");
        expect(text).toContain("RAW_EVENT_INVALID");
        expect(text).toContain("RawEvent failed contract validation");
        expect(text).toContain("normalization");
    });
});
describe("FailureDetailsModal", () => {
    it("renders failure details when given an item", () => {
        let test;
        act(() => {
            test = renderer.create(_jsx(FailureDetailsModal, { item: MOCK_FAILURE, onClose: jest.fn() }));
        });
        const text = collectAllText(test);
        expect(text).toContain("Failure details");
        expect(text).toContain("test_failure_001");
        expect(text).toContain("RAW_EVENT_INVALID");
        expect(text).toContain("RawEvent failed contract validation");
        expect(text).toContain("normalization");
        expect(text).toContain("Close");
    });
});
