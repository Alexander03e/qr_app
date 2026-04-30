import { SettingOutlined } from "@ant-design/icons";
import { Button, Flex, Layout, Select, Typography } from "antd";
import { operatorAuth } from "@apps/operator/helpers/auth";
import { useOperatorLayoutContext } from "@apps/operator/features/Layout/context/useOperatorLayoutContext";
import styles from "./Header.module.scss";
import { useNavigate } from "react-router-dom";

export const Header = () => {
  const { controller } = useOperatorLayoutContext();
  const navigate = useNavigate();

  const handleLogout = async () => {
    try {
      await operatorAuth.logout();
    } finally {
      operatorAuth.clearToken();
      navigate("/o/login", { replace: true });
    }
  };

  return (
    <Layout.Header className={styles.header}>
      <Flex vertical gap={12}>
        <Typography.Title level={4} style={{ margin: 0 }}>
          {controller.activeQueue?.name || "Очередь"}
        </Typography.Title>
        <Typography.Text type="secondary">
          Управление талонами и настройками
        </Typography.Text>
      </Flex>
      <div className={styles.headerActions}>
        <Select<"ru" | "en">
          style={{ width: 110 }}
          value={controller.language}
          options={[
            { label: "RU", value: "ru" },
            { label: "EN", value: "en" },
          ]}
          onChange={controller.onLanguageChange}
        />
        <Button
          icon={<SettingOutlined />}
          onClick={() => controller.setIsSettingsOpen(true)}
        >
          Настройки
        </Button>
        <Button danger onClick={handleLogout}>
          Выйти
        </Button>
      </div>
    </Layout.Header>
  );
};
