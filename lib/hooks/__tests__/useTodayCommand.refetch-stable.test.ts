import fs from "node:fs";
import path from "node:path";

describe("useTodayCommand refetch stability", () => {
  it("depends on refetch fns, not whole hook result objects", () => {
    const src = fs.readFileSync(path.join(__dirname, "../useTodayCommand.ts"), "utf8");
    expect(src).toContain("refetchTodayFacts");
    expect(src).toContain("refetchPriorFacts");
    expect(src).toContain("refetchReadiness");
    expect(src).not.toMatch(/\[todayFacts,\s*priorFacts,\s*readiness,/);
  });

  it("builds TodayCommandModel via useMemo, not setState effect", () => {
    const src = fs.readFileSync(path.join(__dirname, "../useTodayCommand.ts"), "utf8");
    expect(src).toContain("const model = useMemo");
    expect(src).not.toMatch(/setModel\s*\(/);
  });
});
