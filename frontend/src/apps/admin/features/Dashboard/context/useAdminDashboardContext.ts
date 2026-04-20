import { createContext, useContext } from "react";

import type { useAdminDashboardActions } from "../hooks/useAdminDashboardActions";
import type { useAdminDashboardController } from "../hooks/useAdminDashboardController";

interface AdminDashboardContextValue {
  dashboard: ReturnType<typeof useAdminDashboardController>;
  actions: ReturnType<typeof useAdminDashboardActions>;
}

export const AdminDashboardContext =
  createContext<AdminDashboardContextValue | null>(null);

export const useAdminDashboardContext = (): AdminDashboardContextValue => {
  const context = useContext(AdminDashboardContext);

  if (!context) {
    throw new Error("useAdminDashboardContext must be used within AdminDashboardContext.Provider");
  }

  return context;
};
