import { LoadingOutlined } from "@ant-design/icons";
import { Spin } from "antd";

import { Controls } from "@apps/operator/features/Controls";
import { useOperatorLayoutContext } from "@apps/operator/features/Layout/context/useOperatorLayoutContext";
import { QrCode } from "@apps/operator/features/QrCode";
import { TicketsList } from "@apps/operator/features/TicketsList";
import styles from "./QueueWorkspacePage.module.scss";

export const QueueWorkspacePage = () => {
  const { controller } = useOperatorLayoutContext();

  if (controller.queueContentLoading) {
    return <Spin indicator={<LoadingOutlined spin />} />;
  }

  if (controller.queueContentError) {
    return null;
  }

  return (
    <div className={styles.grid}>
      <TicketsList />
      <Controls />
      <div className={styles.rightColumn}>
        <QrCode />
      </div>
    </div>
  );
};
