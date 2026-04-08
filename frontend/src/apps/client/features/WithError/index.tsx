import { useAppStore } from "@apps/client/store/appStore";
import { Error } from "@shared/components";
import type { PropsWithChildren } from "react";

export const WithError = ({ children }: PropsWithChildren) => {
  const { error } = useAppStore();

  if (error) {
    return <Error title={error} />;
  }

  return <>{children}</>;
};
