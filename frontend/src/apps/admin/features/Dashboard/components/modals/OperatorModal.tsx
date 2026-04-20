import { Form, Input, Modal, Select, Switch } from "antd";
import { useTranslation } from "react-i18next";

import { useAdminDashboardContext } from "../../context/useAdminDashboardContext";

export const OperatorModal = () => {
  const { t } = useTranslation();
  const { dashboard, actions } = useAdminDashboardContext();

  return (
    <Modal
      title={
        dashboard.editingOperator
          ? t("admin.operators.edit")
          : t("admin.operators.add")
      }
      open={dashboard.operatorModalOpen}
      onCancel={() => {
        dashboard.setOperatorModalOpen(false);
        dashboard.setEditingOperator(null);
      }}
      onOk={() => dashboard.operatorForm.submit()}
      confirmLoading={
        dashboard.createOperatorMutation.isPending ||
        dashboard.updateOperatorMutation.isPending
      }
    >
      <Form
        layout="vertical"
        form={dashboard.operatorForm}
        initialValues={{ is_active: true, preferred_language: "ru" }}
        onFinish={actions.submitOperator}
      >
        <Form.Item
          name="fullname"
          label={t("admin.operators.fullname")}
          rules={[{ required: true }]}
        >
          <Input />
        </Form.Item>
        <Form.Item
          name="email"
          label={t("admin.operators.email")}
          rules={[{ required: true, type: "email" }]}
        >
          <Input />
        </Form.Item>
        <Form.Item
          name="password"
          label={t("admin.operators.password")}
          rules={
            dashboard.editingOperator
              ? [{ min: 6 }]
              : [{ required: true, min: 6 }]
          }
        >
          <Input.Password />
        </Form.Item>
        <Form.Item name="branch" label={t("admin.operators.branch")}>
          <Select
            allowClear
            options={dashboard.branches.map((item) => ({
              label: item.name,
              value: item.id,
            }))}
          />
        </Form.Item>
        <Form.Item name="preferred_language" label="Язык интерфейса">
          <Select
            options={[
              { label: "Русский", value: "ru" },
              { label: "English", value: "en" },
            ]}
          />
        </Form.Item>
        <Form.Item name="queue_ids" label="Назначенные очереди">
          <Select
            mode="multiple"
            allowClear
            options={dashboard.queues.map((item) => ({
              label: item.name,
              value: item.id,
            }))}
          />
        </Form.Item>
        <Form.Item
          name="is_active"
          label={t("admin.operators.status")}
          valuePropName="checked"
        >
          <Switch />
        </Form.Item>
      </Form>
    </Modal>
  );
};
