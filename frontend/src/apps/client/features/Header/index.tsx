import { HomeFilled } from "@ant-design/icons";
import { useQueueStore } from "@apps/client/store";
import { Flex, Typography } from "antd";
import styles from "./Header.module.scss";
export const Header = () => {
  const { queueData } = useQueueStore();
  return (
    <Flex className={styles.wrapper}>
      <HomeFilled />
      <Typography>{queueData?.queue_name}</Typography>
    </Flex>
  );
};
