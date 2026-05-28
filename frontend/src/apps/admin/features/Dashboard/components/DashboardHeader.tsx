import { Button, Flex, Layout, Select, Typography } from "antd";
import { useAdminDashboardContext } from "../context/useAdminDashboardContext";

export const DashboardHeader = () => {
  const { dashboard, actions } = useAdminDashboardContext();

  return (
    <Layout.Header className="admin-dashboard__header">
      <Flex
        className="admin-dashboard__header-profile"
        align="center"
        gap={12}
        wrap
      >
        <Typography.Text
          strong
          ellipsis
          className="admin-dashboard__header-text"
        >
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
      </Flex>
      <Button onClick={actions.onLogout}>
        {dashboard.t("admin.common.logout")}
      </Button>
    </Layout.Header>
  );
};
