import { createContext, useContext } from "react";

import type { useOperatorLayoutController } from "../hooks/useOperatorLayoutController";

interface OperatorLayoutContextValue {
  controller: ReturnType<typeof useOperatorLayoutController>;
}

export const OperatorLayoutContext =
  createContext<OperatorLayoutContextValue | null>(null);

export const useOperatorLayoutContext = (): OperatorLayoutContextValue => {
  const context = useContext(OperatorLayoutContext);

  if (!context) {
    throw new Error(
      "useOperatorLayoutContext must be used within OperatorLayoutContext.Provider",
    );
  }

  return context;
};
