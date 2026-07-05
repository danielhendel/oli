import React, {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";

import type { ManageMenuAnchor } from "@/components/navigation/ManageMenu";

export type ManageNavigationContextValue = {
  manageVisible: boolean;
  menuAnchor: ManageMenuAnchor | null;
  openManage: (anchor: ManageMenuAnchor) => void;
  closeManage: () => void;
};

const ManageNavigationContext = createContext<ManageNavigationContextValue | null>(null);

export function ManageNavigationProvider({ children }: { children: ReactNode }): React.ReactElement {
  const [manageVisible, setManageVisible] = useState(false);
  const [menuAnchor, setMenuAnchor] = useState<ManageMenuAnchor | null>(null);

  const openManage = useCallback((anchor: ManageMenuAnchor) => {
    setMenuAnchor(anchor);
    setManageVisible(true);
  }, []);

  const closeManage = useCallback(() => {
    setManageVisible(false);
    setMenuAnchor(null);
  }, []);

  const value = useMemo(
    (): ManageNavigationContextValue => ({
      manageVisible,
      menuAnchor,
      openManage,
      closeManage,
    }),
    [manageVisible, menuAnchor, openManage, closeManage],
  );

  return <ManageNavigationContext.Provider value={value}>{children}</ManageNavigationContext.Provider>;
}

export function useManageNavigation(): ManageNavigationContextValue {
  const ctx = useContext(ManageNavigationContext);
  if (ctx == null) {
    throw new Error("useManageNavigation must be used within ManageNavigationProvider");
  }
  return ctx;
}
