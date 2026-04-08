import { useOperatorQueue } from "@apps/operator/store";
import { PATHS } from "@shared/consts";
import { Button, Flex, QRCode } from "antd";

export const QrCode = () => {
  const origin = window.location.origin;
  const { queueId } = useOperatorQueue();
  const link = `${origin}${PATHS.CLIENT}/${queueId}`;

  return (
    <Flex vertical>
      <Button type="link" href={link} target="_blank">
        {link}
      </Button>
      <QRCode value={link} />
    </Flex>
  );
};
