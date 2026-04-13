import {
  Button,
  Checkbox,
  Form,
  Input,
  InputNumber,
  Select,
  Space,
  Switch,
} from "antd";
import { useEffect } from "react";

export type QueueSettingsPayload = {
  name: string;
  language: "ru" | "en";
  clients_limit: number | null;
  called_ticket_timeout_seconds: number | null;
  notification_options: { channels: string[] };
  queue_url: string | null;
  poster_title: string | null;
  poster_subtitle: string | null;
};

export interface QueueSettingsValue {
  id: number;
  name: string;
  language: "ru" | "en";
  clients_limit: number | null;
  called_ticket_timeout_seconds: number | null;
  notification_options:
    | { channels?: string[] }
    | Record<string, unknown>
    | null;
  queue_url: string | null;
  poster_title: string | null;
  poster_subtitle: string | null;
}

interface QueueSettingsPanelProps {
  queue: QueueSettingsValue;
  loading?: boolean;
  submitText?: string;
  onSubmit: (payload: QueueSettingsPayload) => void;
  onOpenPoster: () => void;
}

export const QueueSettingsPanel = ({
  queue,
  loading,
  submitText = "Сохранить",
  onSubmit,
  onOpenPoster,
}: QueueSettingsPanelProps) => {
  const [form] = Form.useForm<
    QueueSettingsPayload & { timerEnabled: boolean }
  >();

  useEffect(() => {
    form.setFieldsValue({
      name: queue.name,
      language: queue.language,
      clients_limit: queue.clients_limit,
      called_ticket_timeout_seconds: queue.called_ticket_timeout_seconds,
      timerEnabled: (queue.called_ticket_timeout_seconds ?? 0) > 0,
      notification_options: {
        channels:
          queue.notification_options &&
          Array.isArray(queue.notification_options.channels)
            ? queue.notification_options.channels
            : [],
      },
      queue_url: queue.queue_url,
      poster_title: queue.poster_title,
      poster_subtitle: queue.poster_subtitle,
    });
  }, [form, queue]);

  return (
    <Form
      layout="vertical"
      form={form}
      onFinish={(values) => {
        onSubmit({
          name: values.name,
          language: values.language,
          clients_limit: values.clients_limit ?? null,
          called_ticket_timeout_seconds: values.timerEnabled
            ? Number(values.called_ticket_timeout_seconds ?? 300)
            : null,
          notification_options: {
            channels: values.notification_options?.channels ?? [],
          },
          queue_url: values.queue_url ?? null,
          poster_title: values.poster_title ?? null,
          poster_subtitle: values.poster_subtitle ?? null,
        });
      }}
    >
      <Form.Item
        name="name"
        label="Название очереди"
        rules={[{ required: true }]}
      >
        <Input />
      </Form.Item>

      <Form.Item
        name="language"
        label="Язык очереди"
        rules={[{ required: true }]}
      >
        <Select
          options={[
            { label: "Русский", value: "ru" },
            { label: "English", value: "en" },
          ]}
        />
      </Form.Item>

      <Form.Item name="clients_limit" label="Лимит клиентов">
        <InputNumber min={1} style={{ width: "100%" }} />
      </Form.Item>

      <Form.Item
        name="timerEnabled"
        label="Таймер вызванного талона"
        valuePropName="checked"
      >
        <Switch />
      </Form.Item>

      <Form.Item noStyle shouldUpdate>
        {() =>
          form.getFieldValue("timerEnabled") ? (
            <Form.Item
              name="called_ticket_timeout_seconds"
              label="Время таймера (секунды)"
              rules={[{ required: true, type: "number", min: 10 }]}
            >
              <InputNumber min={10} style={{ width: "100%" }} />
            </Form.Item>
          ) : null
        }
      </Form.Item>

      <Form.Item
        name={["notification_options", "channels"]}
        label="Каналы уведомлений"
      >
        <Checkbox.Group
          options={[
            { label: "SMS", value: "sms" },
            { label: "VK", value: "vk" },
            { label: "Bot", value: "bot" },
            { label: "Web Push", value: "webpush" },
          ]}
        />
      </Form.Item>

      <Form.Item name="queue_url" label="Ссылка на очередь">
        <Input placeholder="https://..." />
      </Form.Item>

      <Form.Item name="poster_title" label="Заголовок плаката">
        <Input />
      </Form.Item>

      <Form.Item name="poster_subtitle" label="Подзаголовок плаката">
        <Input />
      </Form.Item>

      <Space>
        <Button type="primary" htmlType="submit" loading={loading}>
          {submitText}
        </Button>
        <Button onClick={onOpenPoster}>Открыть редактор плаката</Button>
      </Space>
    </Form>
  );
};
