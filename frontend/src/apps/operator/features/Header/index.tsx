import { SettingOutlined } from "@ant-design/icons";
import { Button, Flex, Layout, Select, Typography } from "antd";

import { useOperatorLayoutContext } from "@apps/operator/features/Layout/context/useOperatorLayoutContext";
import styles from "./Header.module.scss";

export const Header = () => {
  const { controller } = useOperatorLayoutContext();

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
      </div>
    </Layout.Header>
  );
};
