import { Form, Input, Modal, Switch } from "antd";
import { useTranslation } from "react-i18next";

import { useAdminDashboardContext } from "../../context/useAdminDashboardContext";

export const BranchModal = () => {
  const { t } = useTranslation();
  const { dashboard, actions } = useAdminDashboardContext();

  return (
    <Modal
      title={
        dashboard.editingBranch
          ? t("admin.branches.edit")
          : t("admin.branches.add")
      }
      open={dashboard.branchModalOpen}
      onCancel={() => {
        dashboard.setBranchModalOpen(false);
        dashboard.setEditingBranch(null);
      }}
      onOk={() => dashboard.branchForm.submit()}
      confirmLoading={
        dashboard.createBranchMutation.isPending ||
        dashboard.updateBranchMutation.isPending
      }
    >
      <Form
        layout="vertical"
        form={dashboard.branchForm}
        initialValues={{ is_active: true, work_schedule_text: "{}" }}
        onFinish={actions.submitBranch}
      >
        <Form.Item
          name="name"
          label={t("admin.branches.name")}
          rules={[{ required: true }]}
        >
          <Input />
        </Form.Item>
        <Form.Item
          name="address"
          label={t("admin.branches.address")}
          rules={[{ required: true }]}
        >
          <Input />
        </Form.Item>
        <Form.Item
          name="is_active"
          label={t("admin.branches.status")}
          valuePropName="checked"
        >
          <Switch />
        </Form.Item>
        <Form.Item
          name="work_schedule_text"
          label={t("admin.branches.schedule")}
          rules={[
            {
              validator: (_, value: string | undefined) => {
                if (!value) {
                  return Promise.resolve();
                }

                try {
                  const parsed = JSON.parse(value);
                  if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
                    return Promise.resolve();
                  }
                } catch {
                  return Promise.reject(new Error(t("admin.branches.scheduleError")));
                }

                return Promise.reject(new Error(t("admin.branches.scheduleError")));
              },
            },
          ]}
        >
          <Input.TextArea rows={5} />
        </Form.Item>
      </Form>
    </Modal>
  );
};
