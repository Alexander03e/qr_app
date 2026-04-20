import { Button, Empty } from "antd";
import { useOperatorLayoutContext } from "../context/useOperatorLayoutContext";

import styles from "../OperatorLayout.module.scss";

export const OperatorEmptyState = () => {
  const { controller } = useOperatorLayoutContext();

  return (
    <div className={styles.emptyState}>
      <Empty description="Оператор не назначен ни на одну очередь" />
      <Button danger onClick={controller.onLogout}>
        Выйти
      </Button>
    </div>
  );
};
