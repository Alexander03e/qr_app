import { Form, Input, InputNumber, Modal, Select } from "antd";
import { useTranslation } from "react-i18next";

import { useAdminDashboardContext } from "../../context/useAdminDashboardContext";

export const QueueModal = () => {
  const { t } = useTranslation();
  const { dashboard, actions } = useAdminDashboardContext();

  return (
    <Modal
      title={
        dashboard.editingQueue ? t("admin.queues.edit") : t("admin.queues.add")
      }
      open={dashboard.queueModalOpen}
      onCancel={() => {
        dashboard.setQueueModalOpen(false);
        dashboard.setEditingQueue(null);
      }}
      onOk={() => dashboard.queueForm.submit()}
      confirmLoading={
        dashboard.createQueueMutation.isPending ||
        dashboard.updateQueueMutation.isPending
      }
    >
      <Form
        layout="vertical"
        form={dashboard.queueForm}
        onFinish={actions.submitQueue}
      >
        <Form.Item
          name="branch"
          label={t("admin.queues.branch")}
          rules={[{ required: true }]}
        >
          <Select
            options={dashboard.branches.map((item) => ({
              label: item.name,
              value: item.id,
            }))}
          />
        </Form.Item>
        <Form.Item
          name="name"
          label={t("admin.queues.name")}
          rules={[{ required: true }]}
        >
          <Input />
        </Form.Item>
        <Form.Item
          name="language"
          label="Язык"
          initialValue="ru"
          rules={[{ required: true }]}
        >
          <Select
            options={[
              { label: "Русский", value: "ru" },
              { label: "English", value: "en" },
            ]}
          />
        </Form.Item>
        <Form.Item name="clients_limit" label={t("admin.queues.limit")}>
          <InputNumber min={1} style={{ width: "100%" }} />
        </Form.Item>
        <Form.Item
          name="called_ticket_timeout_seconds"
          label="Таймер вызванного талона (сек)"
        >
          <InputNumber min={10} style={{ width: "100%" }} />
        </Form.Item>
        <Form.Item
          name={["notification_options", "channels"]}
          label="Каналы уведомлений"
        >
          <Select
            mode="multiple"
            options={[
              { label: "SMS", value: "sms" },
              { label: "VK", value: "vk" },
              { label: "Bot", value: "bot" },
              { label: "Web Push", value: "webpush" },
            ]}
          />
        </Form.Item>
        <Form.Item name="poster_title" label="Заголовок плаката">
          <Input />
        </Form.Item>
        <Form.Item name="poster_subtitle" label="Подзаголовок плаката">
          <Input />
        </Form.Item>
        <Form.Item name="queue_url" label={t("admin.queues.url")}>
          <Input />
        </Form.Item>
      </Form>
    </Modal>
  );
};
