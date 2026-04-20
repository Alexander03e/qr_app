import { Button, Layout, Select, Space, Typography } from "antd";
import { useAdminDashboardContext } from "../context/useAdminDashboardContext";

export const DashboardHeader = () => {
  const { dashboard, actions } = useAdminDashboardContext();

  return (
    <Layout.Header
      style={{
        background: "#fff",
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        paddingInline: 24,
      }}
    >
      <Space>
        <Typography.Text strong>
          {dashboard.currentAdmin.fullname}
        </Typography.Text>
        <Typography.Text type="secondary">
          {dashboard.currentAdmin.email}
        </Typography.Text>
        <Select
          size="small"
          style={{ width: 120 }}
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
