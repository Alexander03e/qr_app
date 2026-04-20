import { Flex, Layout, Menu, Typography } from "antd";
import { useOperatorLayoutContext } from "../context/useOperatorLayoutContext";

import styles from "../OperatorLayout.module.scss";

export const OperatorSidebar = () => {
  const { controller } = useOperatorLayoutContext();

  return (
    <Layout.Sider width={280} theme="light" className={styles.sider}>
      <div className={styles.siderTop}>
        <Typography.Title level={4} style={{ margin: 0 }}>
          Очереди оператора
        </Typography.Title>
        <Typography.Text type="secondary">
          {controller.queues.length} шт.
        </Typography.Text>
      </div>

      <Menu
        mode="inline"
        selectedKeys={
          controller.activeQueueId ? [String(controller.activeQueueId)] : []
        }
        items={controller.queues.map((queue) => ({
          key: String(queue.id),
          label: (
            <Flex align="center" className={styles.queueMenuItem}>
              <span>{queue.name}</span>
              <Typography.Text type="secondary">#{queue.id}</Typography.Text>
            </Flex>
          ),
        }))}
        onSelect={(event) => controller.onSelectQueue(event.key)}
      />
    </Layout.Sider>
  );
};
