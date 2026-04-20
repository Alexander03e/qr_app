import { Form, Input, Modal, Select } from "antd";
import { useTranslation } from "react-i18next";

import { useAdminDashboardContext } from "../../context/useAdminDashboardContext";

export const FeedbackModal = () => {
  const { t } = useTranslation();
  const { dashboard, actions } = useAdminDashboardContext();

  return (
    <Modal
      title={
        dashboard.editingFeedback
          ? t("admin.feedback.edit")
          : t("admin.feedback.add")
      }
      open={dashboard.feedbackModalOpen}
      onCancel={() => {
        dashboard.setFeedbackModalOpen(false);
        dashboard.setEditingFeedback(null);
      }}
      onOk={() => dashboard.feedbackForm.submit()}
      confirmLoading={
        dashboard.createFeedbackMutation.isPending ||
        dashboard.updateFeedbackMutation.isPending
      }
    >
      <Form
        layout="vertical"
        form={dashboard.feedbackForm}
        onFinish={actions.submitFeedback}
      >
        <Form.Item
          name="type"
          label={t("admin.feedback.type")}
          rules={[{ required: true }]}
        >
          <Select
            options={[
              { label: "FEEDBACK", value: "FEEDBACK" },
              { label: "COMPLAINT", value: "COMPLAINT" },
            ]}
          />
        </Form.Item>
        <Form.Item
          name="status"
          label={t("admin.feedback.status")}
          rules={[{ required: true }]}
        >
          <Select
            options={[
              { label: "NEW", value: "NEW" },
              { label: "IN_PROGRESS", value: "IN_PROGRESS" },
              { label: "RESOLVED", value: "RESOLVED" },
            ]}
          />
        </Form.Item>
        <Form.Item
          name="title"
          label={t("admin.feedback.title")}
          rules={[{ required: true }]}
        >
          <Input />
        </Form.Item>
        <Form.Item
          name="message"
          label={t("admin.feedback.message")}
          rules={[{ required: true }]}
        >
          <Input.TextArea rows={4} />
        </Form.Item>
        <Form.Item name="branch" label={t("admin.feedback.branch")}>
          <Select
            allowClear
            options={dashboard.branches.map((item) => ({
              label: item.name,
              value: item.id,
            }))}
          />
        </Form.Item>
        <Form.Item name="queue" label={t("admin.feedback.queue")}>
          <Select
            allowClear
            options={dashboard.queues.map((item) => ({
              label: item.name,
              value: item.id,
            }))}
          />
        </Form.Item>
      </Form>
    </Modal>
  );
};
