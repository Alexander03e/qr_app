import { Button, Card, Flex, QRCode, Space, Typography } from "antd";
import { useMemo, useState } from "react";

export interface QueuePosterEditorValue {
  queueId: number;
  queueName: string;
  queueUrl: string;
  posterTitle?: string | null;
  posterSubtitle?: string | null;
}

interface QueuePosterEditorProps {
  value: QueuePosterEditorValue;
  onSave: (payload: {
    poster_title: string;
    poster_subtitle: string;
  }) => Promise<void>;
  onBack: () => void;
}

export const QueuePosterEditor = ({
  value,
  onSave,
  onBack,
}: QueuePosterEditorProps) => {
  const [title, setTitle] = useState(
    value.posterTitle || value.queueName || "Очередь без толпы",
  );
  const [subtitle, setSubtitle] = useState(
    value.posterSubtitle || "Отсканируйте QR-код, чтобы встать в очередь",
  );
  const [isSaving, setIsSaving] = useState(false);

  const qrValue = useMemo(
    () => value.queueUrl || `${window.location.origin}/c/${value.queueId}`,
    [value],
  );

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await onSave({ poster_title: title, poster_subtitle: subtitle });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Flex vertical gap={16} style={{ padding: 24 }}>
      <Space>
        <Button onClick={onBack}>Назад</Button>
        <Button type="primary" loading={isSaving} onClick={handleSave}>
          Сохранить плакат
        </Button>
        <Button onClick={() => window.print()}>Печать</Button>
      </Space>

      <Card style={{ maxWidth: 760, margin: "0 auto", width: "100%" }}>
        <Flex vertical align="center" gap={16}>
          <Typography.Title
            level={1}
            editable={{
              onChange: setTitle,
              triggerType: ["text"],
            }}
            style={{ margin: 0, textAlign: "center" }}
          >
            {title}
          </Typography.Title>

          <Typography.Title
            level={3}
            editable={{
              onChange: setSubtitle,
              triggerType: ["text"],
            }}
            style={{ marginTop: 0, textAlign: "center", fontWeight: 400 }}
          >
            {subtitle}
          </Typography.Title>

          <QRCode value={qrValue} size={300} />

          <Typography.Text type="secondary">{qrValue}</Typography.Text>
        </Flex>
      </Card>
    </Flex>
  );
};
