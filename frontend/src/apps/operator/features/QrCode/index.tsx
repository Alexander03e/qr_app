import { useOperatorQueue } from "@apps/operator/store";
import { PATHS } from "@shared/consts";
import { Button, Card, Flex, QRCode, Typography } from "antd";

export const QrCode = () => {
  const origin = window.location.origin;
  const { queueId } = useOperatorQueue();
  const link = `${origin}${PATHS.CLIENT}/${queueId}`;
  const boardLink = `${origin}${PATHS.BOARD}/${queueId}`;
  const qrLink = link;

  const linkCards = [
    {
      key: "board",
      label: "Ссылка на табло",
      value: boardLink,
    },
    {
      key: "queue",
      label: "Ссылка на очередь",
      value: link,
    },
  ];

  return (
    <Flex vertical align="flex-start" gap={12} style={{ width: "100%" }}>
      <Flex align="flex-start" vertical gap={8} style={{ width: "100%" }}>
        {linkCards.map((item) => (
          <Card key={item.key} size="small" style={{ width: "100%" }}>
            <Flex vertical gap={6}>
              <Typography.Text type="secondary">{item.label}</Typography.Text>
              <Typography.Text
                copyable={{ text: item.value }}
                style={{ wordBreak: "break-all" }}
              >
                {item.value}
              </Typography.Text>
              <Button type="primary" href={item.value} target="_blank">
                Открыть
              </Button>
            </Flex>
          </Card>
        ))}
      </Flex>

      <Card size="small" style={{ width: "100%" }}>
        <Flex vertical gap={8} align="center">
          <Typography.Text type="secondary">Текущий QR-код</Typography.Text>
          <QRCode value={qrLink} />
        </Flex>
      </Card>
    </Flex>
  );
};
