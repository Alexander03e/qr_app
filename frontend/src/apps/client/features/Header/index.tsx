import { useQueueStore } from "@apps/client/store";
import { Typography } from "antd";

export const Header = () => {
  const { queueData } = useQueueStore();
  return (
    <div>
      <Typography>{queueData?.queue_name}</Typography>
    </div>
  );
};
