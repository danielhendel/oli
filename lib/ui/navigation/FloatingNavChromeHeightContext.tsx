import { createContext, type ReactNode } from "react";

/**
 * Bottom inset for scroll content when the floating tab chrome is shown from the
 * root stack (health module routes), where `BottomTabBarHeightContext` is unavailable.
 */
export const FloatingNavChromeHeightContext = createContext<number | undefined>(undefined);

export function FloatingNavChromeHeightProvider({
  value,
  children,
}: {
  value: number | undefined;
  children: ReactNode;
}) {
  return (
    <FloatingNavChromeHeightContext.Provider value={value}>
      {children}
    </FloatingNavChromeHeightContext.Provider>
  );
}
