import { deriveUserDisplayInitial } from "@/lib/data/profile/deriveUserDisplayInitial";

describe("deriveUserDisplayInitial", () => {
  it("uses profile first name first character uppercase", () => {
    expect(deriveUserDisplayInitial({ firstName: "Daniel" })).toBe("D");
  });

  it("trims whitespace and uppercases lowercase names", () => {
    expect(deriveUserDisplayInitial({ firstName: "  daniel  " })).toBe("D");
  });

  it("falls back to displayName then email", () => {
    expect(deriveUserDisplayInitial({ displayName: "Alex User" })).toBe("A");
    expect(deriveUserDisplayInitial({ email: "sam@example.com" })).toBe("S");
  });

  it("returns O when no identity fields are available", () => {
    expect(deriveUserDisplayInitial({})).toBe("O");
    expect(deriveUserDisplayInitial({ firstName: "   " })).toBe("O");
  });
});
