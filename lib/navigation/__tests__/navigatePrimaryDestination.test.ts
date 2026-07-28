import { navigatePrimaryDestination } from "@/lib/navigation/navigatePrimaryDestination";
import { PRIMARY_NAVIGATION_ITEMS } from "@/lib/navigation/primaryNavigationConfig";

describe("navigatePrimaryDestination", () => {
  it("does not push when already on Strength landing", () => {
    const push = jest.fn();
    const replace = jest.fn();
    const strength = PRIMARY_NAVIGATION_ITEMS.find((i) => i.id === "strength")!;
    navigatePrimaryDestination({
      item: strength,
      activeDestination: "strength",
      pathname: "/workouts",
      router: { push, replace },
    });
    expect(push).not.toHaveBeenCalled();
    expect(replace).not.toHaveBeenCalled();
  });

  it("replaces when switching between stack primary landings", () => {
    const push = jest.fn();
    const replace = jest.fn();
    const cardio = PRIMARY_NAVIGATION_ITEMS.find((i) => i.id === "cardio")!;
    navigatePrimaryDestination({
      item: cardio,
      activeDestination: "strength",
      pathname: "/workouts",
      router: { push, replace },
    });
    expect(replace).toHaveBeenCalledWith("/(app)/cardio");
    expect(push).not.toHaveBeenCalled();
  });

  it("pushes Dash from a stack landing via overlay (no tabBarProps)", () => {
    const push = jest.fn();
    const replace = jest.fn();
    const dash = PRIMARY_NAVIGATION_ITEMS.find((i) => i.id === "dash")!;
    navigatePrimaryDestination({
      item: dash,
      activeDestination: "strength",
      pathname: "/workouts",
      router: { push, replace },
    });
    expect(push).toHaveBeenCalledWith("/(app)/(tabs)/dash");
  });

  it("invokes health menu callback without routing", () => {
    const push = jest.fn();
    const onHealthMenuPress = jest.fn();
    const health = PRIMARY_NAVIGATION_ITEMS.find((i) => i.id === "health")!;
    navigatePrimaryDestination({
      item: health,
      activeDestination: "dash",
      pathname: "/dash",
      router: { push, replace: jest.fn() },
      onHealthMenuPress,
    });
    expect(onHealthMenuPress).toHaveBeenCalled();
    expect(push).not.toHaveBeenCalled();
  });
});
