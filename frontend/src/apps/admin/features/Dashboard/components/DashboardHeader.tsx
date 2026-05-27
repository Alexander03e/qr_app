import { Button, Layout, Select, Space, Typography } from "antd";
import { useAdminDashboardContext } from "../context/useAdminDashboardContext";

export const DashboardHeader = () => {
  const { dashboard, actions } = useAdminDashboardContext();

  return (
    <Layout.Header className="admin-dashboard__header">
      <Space className="admin-dashboard__header-profile" size={[8, 4]} wrap>
        <Typography.Text strong ellipsis className="admin-dashboard__header-text">
          {dashboard.currentAdmin.fullname}
        </Typography.Text>
        <Typography.Text
          type="secondary"
          ellipsis
          className="admin-dashboard__header-text"
        >
          {dashboard.currentAdmin.email}
        </Typography.Text>
        <Select
          size="small"
          className="admin-dashboard__language-select"
          value={dashboard.currentAdmin.preferred_language}
          onChange={actions.onPreferredLanguageChange}
          options={[
            { label: "RU", value: "ru" },
            { label: "EN", value: "en" },
          ]}
        />
      </Space>
      <Button onClick={actions.onLogout}>
        {dashboard.t("admin.common.logout")}
      </Button>
    </Layout.Header>
  );
};
