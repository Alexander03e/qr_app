import {
  AlertOutlined,
  ApartmentOutlined,
  AreaChartOutlined,
  SettingOutlined,
  TeamOutlined,
  UnorderedListOutlined,
} from "@ant-design/icons";
import type { MenuProps } from "antd";
import { Layout, Menu, Typography } from "antd";
import { useTranslation } from "react-i18next";
import { useLocation, useNavigate } from "react-router-dom";

import { useAdminDashboardContext } from "../context/useAdminDashboardContext";

export const DashboardSidebar = () => {
  const { t } = useTranslation();
  const { actions } = useAdminDashboardContext();
  const location = useLocation();
  const navigate = useNavigate();

  const currentPathSegment = location.pathname.split("/")[2] || "operators";

  const items: MenuProps["items"] = [
    {
      key: "operators",
      icon: <TeamOutlined />,
      label: t("admin.menu.operators"),
    },
    {
      key: "branches",
      icon: <ApartmentOutlined />,
      label: t("admin.menu.branches"),
    },
    {
      key: "queues",
      icon: <UnorderedListOutlined />,
      label: t("admin.menu.queues"),
    },
    {
      key: "feedback",
      icon: <AlertOutlined />,
      label: t("admin.menu.feedback"),
    },
    {
      key: "metrics",
      icon: <AreaChartOutlined />,
      label: t("admin.menu.metrics"),
    },
    {
      key: "settings",
      icon: <SettingOutlined />,
      label: t("admin.menu.settings"),
    },
  ];

  return (
    <Layout.Sider width={240} theme="light">
      <div style={{ padding: 16 }}>
        <Typography.Title level={4} style={{ marginBottom: 0 }}>
          {t("admin.title")}
        </Typography.Title>
        <Typography.Text type="secondary">
          {actions.companyName}
        </Typography.Text>
      </div>
      <Menu
        mode="inline"
        selectedKeys={[currentPathSegment]}
        onSelect={(e) => navigate(`/a/${e.key}`)}
        items={items}
      />
    </Layout.Sider>
  );
};
