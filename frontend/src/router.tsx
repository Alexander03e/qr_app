import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import "@shared/assets/scss/index.scss";
import { buildRouterPath, PATHS } from "@shared/consts";
import { lazy } from "react";
import { DebugPage } from "./pages/debug/";

const ClientApp = lazy(() =>
  import(`@apps/client`).then((module) => ({ default: module.ClientApp })),
);
const OperatorApp = lazy(() =>
  import(`@apps/operator`).then((module) => ({ default: module.OperatorApp })),
);
const AdminApp = lazy(() =>
  import(`@apps/admin`).then((module) => ({ default: module.AdminApp })),
);

export const AppRouter = () => {
  return (
    <BrowserRouter>
      <Routes>
        <Route
          path={buildRouterPath(PATHS.CLIENT, "*")}
          element={<ClientApp />}
        />
        <Route
          path={buildRouterPath(PATHS.OPERATOR, "*")}
          element={<OperatorApp />}
        />
        <Route
          path={buildRouterPath(PATHS.ADMIN, "*")}
          element={<AdminApp />}
        />
        <Route path="_debug" element={<DebugPage />} />
        <Route element={<Navigate to="_debug" />} index />
      </Routes>
    </BrowserRouter>
  );
};
