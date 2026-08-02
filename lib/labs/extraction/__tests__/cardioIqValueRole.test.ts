import {
  assignSourceValueRole,
  isProjectableSourceValueRole,
  markReferenceSourceValueRole,
} from "../cardioIqValueRole";

describe("cardioIqValueRole", () => {
  it("marks equality and censored inequalities as current_result", () => {
    expect(
      assignSourceValueRole({
        isCardioIq: true,
        isHistorical: false,
        result: { kind: "numeric", value: 179, comparator: "eq" },
      }),
    ).toBe("current_result");
    expect(
      assignSourceValueRole({
        isCardioIq: true,
        isHistorical: false,
        result: { kind: "numeric", value: 4, comparator: "lt" },
      }),
    ).toBe("current_result");
    expect(
      assignSourceValueRole({
        isCardioIq: false,
        isHistorical: false,
        result: { kind: "numeric", value: 4, comparator: "lt" },
      }),
    ).toBe("current_result");
  });

  it("keeps Pattern as current_result", () => {
    expect(
      assignSourceValueRole({
        isCardioIq: true,
        isHistorical: false,
        result: { kind: "pattern", value: "Pattern B" },
      }),
    ).toBe("current_result");
  });

  it("marks historical rows as historical_result", () => {
    expect(
      assignSourceValueRole({
        isCardioIq: true,
        isHistorical: true,
        result: { kind: "numeric", value: 179, comparator: "eq" },
      }),
    ).toBe("historical_result");
  });

  it("only current_result (or legacy null) is projectable; explicit reference is not", () => {
    expect(isProjectableSourceValueRole("current_result")).toBe(true);
    expect(isProjectableSourceValueRole(null)).toBe(true);
    expect(isProjectableSourceValueRole(markReferenceSourceValueRole("lt"))).toBe(false);
    expect(isProjectableSourceValueRole("unknown")).toBe(false);
  });
});
