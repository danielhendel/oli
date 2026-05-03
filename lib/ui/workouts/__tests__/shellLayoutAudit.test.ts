import { isShellLayoutAuditEnabled } from "@/lib/ui/workouts/shellLayoutAudit";

describe("shellLayoutAudit", () => {
  it("is disabled unless EXPO_PUBLIC_OLI_SHELL_LAYOUT_AUDIT=1 in __DEV__", () => {
    expect(isShellLayoutAuditEnabled()).toBe(false);
  });
});
