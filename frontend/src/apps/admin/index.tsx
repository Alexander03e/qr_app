import { LoadingOutlined } from "@ant-design/icons";
import { AdminDashboard } from "@apps/admin/features/Dashboard";
import { AdminLogin } from "@apps/admin/features/Login";
import { AdminPosterPage } from "@apps/admin/features/Poster";
import { adminAuth } from "@apps/admin/helpers/auth";
import { Spin } from "antd";
import { useQuery } from "@tanstack/react-query";
import { useEffect } from "react";
import { Navigate, Route, Routes, useLocation } from "react-router-dom";

export const AdminApp = () => {
  const location = useLocation();
  const token = adminAuth.readToken();
  const isLoginRoute = location.pathname.startsWith("/a/login");

  const {
    data: sessionData,
    isLoading: isSessionLoading,
    error: sessionError,
  } = useQuery({
    queryKey: ["admin", "me", token],
    queryFn: () => adminAuth.me(),
    enabled: Boolean(token) && !isLoginRoute,
    retry: false,
  });

  useEffect(() => {
    if (sessionError) {
      adminAuth.clearToken();
    }
  }, [sessionError]);

  if (token && !isLoginRoute && isSessionLoading) {
    return <Spin indicator={<LoadingOutlined spin />} />;
  }

  const isAuthorized = Boolean(token) && Boolean(sessionData?.admin);
  const nextUrl = encodeURIComponent(`${location.pathname}${location.search}`);

  return (
    <Routes>
      <Route path="/login" element={<AdminLogin />} />
      <Route
        path="/queues/:queueId/poster"
        element={
          isAuthorized ? (
            <AdminPosterPage />
          ) : (
            <Navigate replace to={`/a/login?next=${nextUrl}`} />
          )
        }
      />
      <Route
        path="/*"
        element={
          isAuthorized && sessionData?.admin ? (
            <AdminDashboard admin={sessionData.admin} />
          ) : (
            <Navigate replace to={`/a/login?next=${nextUrl}`} />
          )
        }
      />
    </Routes>
  );
};
