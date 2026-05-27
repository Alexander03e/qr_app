import { useOperatorQueue } from "@apps/operator/store";
import { PATHS } from "@shared/consts";
import { Button, Flex, QRCode } from "antd";

export const QrCode = () => {
  const origin = window.location.origin;
  const { queueId } = useOperatorQueue();
  const link = `${origin}${PATHS.CLIENT}/${queueId}`;

  return (
    <Flex vertical align="center" gap={8} style={{ minWidth: 0, width: "100%" }}>
      <Button
        type="link"
        href={link}
        target="_blank"
        style={{
          height: "auto",
          maxWidth: "100%",
          textAlign: "center",
          whiteSpace: "normal",
          wordBreak: "break-all",
        }}
      >
        {link}
      </Button>
      <QRCode value={link} />
    </Flex>
  );
};
