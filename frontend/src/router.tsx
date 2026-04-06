import { BrowserRouter, Route, Routes } from "react-router-dom";
import { AdminApp, OperatorApp, ClientApp } from "@apps";
import "@shared/assets/scss/index.scss";
import { buildRouterPath, PATHS } from "@shared/consts";

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
      </Routes>
    </BrowserRouter>
  );
};
