import type { Router, Href } from "expo-router";
import type { BottomTabBarProps } from "@react-navigation/bottom-tabs";
import { CommonActions } from "@react-navigation/native";
import { normalizePathname } from "@/lib/navigation/normalizePathname";
import {
  PRIMARY_NAV_DASH_HREF,
  PRIMARY_NAV_STACK_HREFS,
  type PrimaryNavigationDestination,
  type PrimaryNavigationItem,
  assertNeverPrimaryDestination,
} from "@/lib/navigation/primaryNavigationConfig";

const STACK_PRIMARY_PATHS = new Set([
  normalizePathname("/workouts"),
  normalizePathname("/workouts/overview"),
  normalizePathname("/cardio"),
  normalizePathname("/nutrition"),
  normalizePathname("/nutrition/overview"),
]);

function isOnStackPrimaryLanding(pathname: string | null | undefined): boolean {
  const p = normalizePathname(pathname);
  return STACK_PRIMARY_PATHS.has(p);
}

function destinationMatchesPathname(
  id: PrimaryNavigationDestination,
  pathname: string | null | undefined,
): boolean {
  const p = normalizePathname(pathname);
  switch (id) {
    case "dash":
      return p === "/dash";
    case "strength":
      return p === "/workouts" || p === "/workouts/overview";
    case "cardio":
      return p === "/cardio";
    case "nutrition":
      return p === "/nutrition" || p === "/nutrition/overview";
    case "health":
      return false;
    default:
      return assertNeverPrimaryDestination(id);
  }
}

export type NavigatePrimaryDestinationArgs = {
  item: PrimaryNavigationItem;
  activeDestination: PrimaryNavigationDestination | null;
  pathname: string | null | undefined;
  router: Pick<Router, "push" | "replace">;
  /** Real tab navigator props when mounted inside `(tabs)`. */
  tabBarProps?: BottomTabBarProps | null;
  onHealthMenuPress?: () => void;
};

/**
 * Navigate to a primary destination without duplicating the current screen.
 * Health opens the menu via callback (no route change).
 */
export function navigatePrimaryDestination(args: NavigatePrimaryDestinationArgs): void {
  const { item, activeDestination, pathname, router, tabBarProps, onHealthMenuPress } = args;
  const action = item.action;

  if (action.kind === "menu") {
    onHealthMenuPress?.();
    return;
  }

  if (activeDestination === item.id && destinationMatchesPathname(item.id, pathname)) {
    return;
  }

  if (action.kind === "tab") {
    if (tabBarProps) {
      const { state, navigation } = tabBarProps;
      const route = state.routes.find((r) => r.name === action.tabName);
      if (!route) {
        router.push(PRIMARY_NAV_DASH_HREF as Href);
        return;
      }
      const alreadyFocused = state.routes[state.index]?.name === route.name;
      if (alreadyFocused) return;
      const event = navigation.emit({
        type: "tabPress",
        target: route.key,
        canPreventDefault: true,
      });
      if (event.defaultPrevented) return;
      const navAction = CommonActions.navigate({
        name: route.name,
        merge: true,
        ...(route.params !== undefined ? { params: route.params as object } : {}),
      });
      navigation.dispatch(
        Object.assign(navAction, { target: state.key }) as Parameters<
          typeof navigation.dispatch
        >[0],
      );
      return;
    }
    router.push(PRIMARY_NAV_DASH_HREF as Href);
    return;
  }

  if (action.kind === "href") {
    const href = action.href;
    if (isOnStackPrimaryLanding(pathname)) {
      router.replace(href);
    } else {
      router.push(href);
    }
    return;
  }

  const _exhaustive: never = action;
  void _exhaustive;
}

/** Href lookup for stack primary destinations (tests / overlay). */
export function primaryStackHrefFor(
  id: "strength" | "cardio" | "nutrition",
): Href {
  return PRIMARY_NAV_STACK_HREFS[id];
}
