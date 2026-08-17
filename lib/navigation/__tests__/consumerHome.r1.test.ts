import {
  ANALYTICS_FIRST_PROHIBITED_COPY,
  CONSUMER_HOME_HREF,
  CONSUMER_HOME_LABEL,
  CONSUMER_HOME_PATHNAME,
} from "@/lib/navigation/consumerHome";
import { OLI_TAB_ROUTES } from "@/lib/navigation/tabRoutes";

describe("consumerHome", () => {
  it("keeps the Dash filesystem route as canonical Home", () => {
    expect(CONSUMER_HOME_HREF).toBe(OLI_TAB_ROUTES.dash);
    expect(CONSUMER_HOME_HREF).toBe("/(app)/(tabs)/dash");
    expect(CONSUMER_HOME_PATHNAME).toBe("/dash");
  });

  it("uses Home as the user-facing product name, not Today or Dash", () => {
    expect(CONSUMER_HOME_LABEL).toBe("Home");
    expect(CONSUMER_HOME_LABEL).not.toBe("Today");
    expect(CONSUMER_HOME_LABEL).not.toBe("Dash");
  });

  it("forbids recommendation and authorship copy in R1 shells", () => {
    expect(ANALYTICS_FIRST_PROHIBITED_COPY).toEqual(
      expect.arrayContaining(["Oli recommends", "Your priority is", "Oli created your plan"]),
    );
  });
});
