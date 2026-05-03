import { OLI_DARK } from "@/lib/ui/theme/oliSemantic";
import { UI_CARD_SURFACE, UI_PANEL_SURFACE, UI_SURFACE_ELEVATED } from "@/lib/ui/theme/uiTokens";

describe("card surface aligns with Manage menu panel", () => {
  it("exports one panel fill: Manage popup, UI_SURFACE_ELEVATED, and cards", () => {
    expect(UI_PANEL_SURFACE).toBe(UI_SURFACE_ELEVATED);
    expect(UI_CARD_SURFACE).toBe(UI_PANEL_SURFACE);
    expect(UI_CARD_SURFACE).toBe(OLI_DARK.surfaceElevated);
    expect(OLI_DARK.cardSurface).toBe(OLI_DARK.surfaceElevated);
  });
});
