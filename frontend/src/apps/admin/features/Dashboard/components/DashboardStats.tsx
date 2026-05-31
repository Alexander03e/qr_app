import { Space, Statistic } from "antd";
import {
  ApartmentOutlined,
  BranchesOutlined,
  CommentOutlined,
  TeamOutlined,
  SmileOutlined,
} from "@ant-design/icons";
import { useTranslation } from "react-i18next";
import { useAdminDashboardContext } from "../context/useAdminDashboardContext";

export const DashboardStats = () => {
  const { t } = useTranslation();
  const { dashboard } = useAdminDashboardContext();

  const stats = [
    {
      title: t("admin.stats.operators"),
      value: dashboard.operators.length,
      color: "#e8f1ff",
      border: "#b3d1ff",
      icon: <TeamOutlined />,
    },
    {
      title: t("admin.stats.queues"),
      value: dashboard.queues.length,
      color: "#f2ecff",
      border: "#d2c3ff",
      icon: <ApartmentOutlined />,
    },
    {
      title: t("admin.stats.branches"),
      value: dashboard.branches.length,
      color: "#e9fbf0",
      border: "#bdeecd",
      icon: <BranchesOutlined />,
    },
    {
      title: t("admin.stats.feedback"),
      value: dashboard.feedback.length,
      color: "#fff2e5",
      border: "#ffd3a8",
      icon: <CommentOutlined />,
    },
    {
      title: t("admin.metrics.activeTickets"),
      value: dashboard.metrics?.business.active_tickets ?? 0,
      color: "#fff0f3",
      border: "#ffc2cd",
      icon: <SmileOutlined />,
    },
  ];

  return (
    <Space size={[16, 12]} wrap style={{ marginBottom: 20, width: "100%" }}>
      {stats.map((stat) => (
        <div
          key={stat.title}
          style={{
            background: stat.color,
            border: `1px solid ${stat.border}`,
            borderRadius: 10,
            padding: "10px 12px",
            minWidth: 150,
          }}
        >
          <Statistic title={stat.title} value={stat.value} prefix={stat.icon} />
        </div>
      ))}
    </Space>
  );
};
