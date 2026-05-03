import { getOliTheme, OLI_DEFAULT_THEME_MODE } from "@/lib/ui/theme/oliTheme";
import { OLI_DARK } from "@/lib/ui/theme/oliSemantic";
import { UI_APP_SCREEN_BG, UI_CARD_SURFACE, UI_PANEL_SURFACE, UI_SURFACE_ELEVATED } from "@/lib/ui/theme/uiTokens";

describe("oliSemantic dark palette", () => {
  it("exposes the production dark surface + text scale", () => {
    expect(OLI_DARK.background).toBe("#0B0D10");
    expect(OLI_DARK.cardSurface).toBe("#181D23");
    expect(OLI_DARK.cardSurface).toBe(OLI_DARK.surfaceElevated);
    expect(OLI_DARK.surfaceElevated).toBe("#181D23");
    expect(OLI_DARK.textPrimary).toBe("#F7F8FA");
    expect(OLI_DARK.navSurface).toBe("rgba(18,22,27,0.92)");
    expect(OLI_DARK.overlay).toBe("rgba(0,0,0,0.58)");
  });

  it("maps React Navigation theme to dark chrome + accent primary", () => {
    const t = getOliTheme(OLI_DEFAULT_THEME_MODE);
    expect(t.navigationTheme.dark).toBe(true);
    expect(t.navigationTheme.colors.background).toBe(OLI_DARK.background);
    expect(t.navigationTheme.colors.text).toBe(OLI_DARK.textPrimary);
    expect(t.navigationTheme.colors.card).toBe(OLI_DARK.background);
  });

  it("aliases legacy uiTokens exports to the active dark palette", () => {
    expect(UI_APP_SCREEN_BG).toBe(OLI_DARK.appScreenBg);
    expect(UI_CARD_SURFACE).toBe(OLI_DARK.cardSurface);
    expect(UI_PANEL_SURFACE).toBe(OLI_DARK.surfaceElevated);
    expect(UI_SURFACE_ELEVATED).toBe(UI_PANEL_SURFACE);
  });
});
