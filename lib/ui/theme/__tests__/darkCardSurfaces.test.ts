import { elevatedCardSurfaceStyle } from "@/lib/ui/theme/elevatedCardSurface";
import { OLI_DARK } from "@/lib/ui/theme/oliSemantic";
import { UI_CARD_SURFACE } from "@/lib/ui/theme/uiTokens";

describe("dark card surfaces and shared layout tokens", () => {
  it("elevatedCardSurfaceStyle uses the dark card surface (not white)", () => {
    expect(elevatedCardSurfaceStyle.backgroundColor).toBe(OLI_DARK.cardSurface);
    expect(elevatedCardSurfaceStyle.backgroundColor).toBe(UI_CARD_SURFACE);
    expect(elevatedCardSurfaceStyle.backgroundColor).not.toBe("#FFFFFF");
  });
});
