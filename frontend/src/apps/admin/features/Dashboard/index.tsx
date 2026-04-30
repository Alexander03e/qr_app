import type { AdminProfile } from "@apps/admin/helpers/auth";
import { Layout } from "antd";
import { useNavigate } from "react-router-dom";
import { Outlet } from "react-router-dom";

import { DashboardHeader } from "./components/DashboardHeader";
import { DashboardSidebar } from "./components/DashboardSidebar";
import { DashboardStats } from "./components/DashboardStats";
import { BranchModal } from "./components/modals/BranchModal";
import { FeedbackModal } from "./components/modals/FeedbackModal";
import { OperatorModal } from "./components/modals/OperatorModal";
import { QueueDetailsModal } from "./components/modals/QueueDetailsModal";
import { QueueModal } from "./components/modals/QueueModal";
import { AdminDashboardContext } from "./context/useAdminDashboardContext";
import { useAdminDashboardActions } from "./hooks/useAdminDashboardActions";
import { useAdminDashboardController } from "./hooks/useAdminDashboardController";

interface AdminDashboardProps {
  admin: AdminProfile;
}

export const AdminDashboard = ({ admin }: AdminDashboardProps) => {
  const navigate = useNavigate();
  const dashboard = useAdminDashboardController({ admin });
  const actions = useAdminDashboardActions({ dashboard, navigate });

  return (
    <AdminDashboardContext.Provider value={{ dashboard, actions }}>
      <Layout style={{ minHeight: "100vh" }}>
        <DashboardSidebar />

        <Layout>
          <DashboardHeader />

          <Layout.Content style={{ padding: 24 }}>
            <DashboardStats />
            <Outlet />
          </Layout.Content>
        </Layout>

        <BranchModal />
        <OperatorModal />
        <QueueDetailsModal />
        <QueueModal />
        <FeedbackModal />
      </Layout>
    </AdminDashboardContext.Provider>
  );
};
