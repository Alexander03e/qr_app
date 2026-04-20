import { Space, Statistic } from "antd";
import { useTranslation } from "react-i18next";
import { useAdminDashboardContext } from "../context/useAdminDashboardContext";

export const DashboardStats = () => {
  const { t } = useTranslation();
  const { dashboard } = useAdminDashboardContext();

  return (
    <Space size={16} style={{ marginBottom: 20 }}>
      <Statistic
        title={t("admin.stats.operators")}
        value={dashboard.operators.length}
      />
      <Statistic
        title={t("admin.stats.queues")}
        value={dashboard.queues.length}
      />
      <Statistic
        title={t("admin.stats.feedback")}
        value={dashboard.feedback.length}
      />
      <Statistic
        title={t("admin.metrics.totalRequests")}
        value={dashboard.metrics?.total_requests ?? 0}
      />
    </Space>
  );
};
