import { SYSTEM_ACCENT } from "@/lib/ui/theme/systemAccent";
import { UI_CALENDAR_RING_STROKE, UI_NAV_TAB_ICON_ACTIVE, UI_NAV_TAB_ICON_INACTIVE } from "@/lib/ui/theme/uiTokens";

describe("floating bottom nav tab colors", () => {
  it("uses calendar ring stroke blue for active tabs", () => {
    expect(UI_NAV_TAB_ICON_ACTIVE).toBe(SYSTEM_ACCENT);
    expect(UI_CALENDAR_RING_STROKE).toBe(SYSTEM_ACCENT);
  });

  it("uses white for inactive tabs", () => {
    expect(UI_NAV_TAB_ICON_INACTIVE).toBe("#FFFFFF");
  });
});
