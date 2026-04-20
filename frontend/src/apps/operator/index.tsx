import { LoadingOutlined } from "@ant-design/icons";
import { useQuery } from "@tanstack/react-query";
import { useEffect } from "react";
import { Navigate, Route, Routes, useLocation } from "react-router-dom";
import { OperatorLogin } from "./features/Login";
import { OperatorPosterPage } from "./features/Poster";
import { operatorAuth } from "./helpers/auth";
import { Spin } from "antd";
import { OperatorLayout } from "./features/Layout";
import { OperatorLayoutContext } from "./features/Layout/context/useOperatorLayoutContext";
import { useOperatorLayoutController } from "./features/Layout/hooks/useOperatorLayoutController";
import { QueueWorkspacePage } from "./pages/QueueWorkspacePage";

export const OperatorAppInner = () => {
  const controller = useOperatorLayoutController();

  if (controller.isQueuesLoading) {
    return <Spin indicator={<LoadingOutlined spin />} />;
  }

  return (
    <OperatorLayoutContext.Provider value={{ controller }}>
      <OperatorLayout>
        <QueueWorkspacePage />
      </OperatorLayout>
    </OperatorLayoutContext.Provider>
  );
};

export const OperatorApp = () => {
  const location = useLocation();
  const token = operatorAuth.readToken();
  const isLoginRoute = location.pathname.startsWith("/o/login");

  const {
    data: sessionData,
    isLoading: isSessionLoading,
    error: sessionError,
  } = useQuery({
    queryKey: ["operator", "me", token],
    queryFn: () => operatorAuth.me(),
    enabled: Boolean(token) && !isLoginRoute,
    retry: false,
  });

  useEffect(() => {
    if (sessionError) {
      operatorAuth.clearToken();
    }
  }, [sessionError]);

  if (token && !isLoginRoute && isSessionLoading) {
    return <Spin indicator={<LoadingOutlined spin />} />;
  }

  const isAuthorized = Boolean(token) && Boolean(sessionData?.operator);
  const nextUrl = encodeURIComponent(`${location.pathname}${location.search}`);

  return (
    <Routes>
      <Route path="/login" element={<OperatorLogin />} />
      <Route
        path="/:queueId/poster"
        element={
          isAuthorized ? (
            <OperatorPosterPage />
          ) : (
            <Navigate replace to={`/o/login?next=${nextUrl}`} />
          )
        }
      />
      <Route
        path="/:queueId"
        element={
          isAuthorized ? (
            <OperatorAppInner />
          ) : (
            <Navigate replace to={`/o/login?next=${nextUrl}`} />
          )
        }
      />
      <Route
        path="/"
        element={
          isAuthorized ? (
            <OperatorAppInner />
          ) : (
            <Navigate replace to={`/o/login?next=${nextUrl}`} />
          )
        }
      />
    </Routes>
  );
};
