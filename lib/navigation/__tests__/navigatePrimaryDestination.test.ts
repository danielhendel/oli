import { navigatePrimaryDestination } from "@/lib/navigation/navigatePrimaryDestination";
import { PRIMARY_NAVIGATION_ITEMS } from "@/lib/navigation/primaryNavigationConfig";

describe("navigatePrimaryDestination", () => {
  it("does not push when already on Home landing", () => {
    const push = jest.fn();
    const replace = jest.fn();
    const home = PRIMARY_NAVIGATION_ITEMS.find((i) => i.id === "home")!;
    navigatePrimaryDestination({
      item: home,
      activeDestination: "home",
      pathname: "/dash",
      router: { push, replace },
    });
    expect(push).not.toHaveBeenCalled();
    expect(replace).not.toHaveBeenCalled();
  });

  it("pushes Plan from a stack landing via overlay (no tabBarProps)", () => {
    const push = jest.fn();
    const replace = jest.fn();
    const plan = PRIMARY_NAVIGATION_ITEMS.find((i) => i.id === "plan")!;
    navigatePrimaryDestination({
      item: plan,
      activeDestination: "home",
      pathname: "/workouts",
      router: { push, replace },
    });
    expect(push).toHaveBeenCalledWith("/(app)/(tabs)/program");
    expect(replace).not.toHaveBeenCalled();
  });

  it("pushes Home from a stack landing via overlay (no tabBarProps)", () => {
    const push = jest.fn();
    const replace = jest.fn();
    const home = PRIMARY_NAVIGATION_ITEMS.find((i) => i.id === "home")!;
    navigatePrimaryDestination({
      item: home,
      activeDestination: "you",
      pathname: "/settings",
      router: { push, replace },
    });
    expect(push).toHaveBeenCalledWith("/(app)/(tabs)/dash");
  });

  it("does not invoke a health-menu callback as a fifth destination", () => {
    const push = jest.fn();
    const onHealthMenuPress = jest.fn();
    const you = PRIMARY_NAVIGATION_ITEMS.find((i) => i.id === "you")!;
    navigatePrimaryDestination({
      item: you,
      activeDestination: "home",
      pathname: "/dash",
      router: { push, replace: jest.fn() },
      onHealthMenuPress,
    });
    expect(onHealthMenuPress).not.toHaveBeenCalled();
    expect(push).toHaveBeenCalledWith("/(app)/(tabs)/you");
  });
});
