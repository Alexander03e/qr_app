import type { AdminCompany } from "@shared/entities/admin/types";
import type { FormInstance } from "antd";
import { Button, Form, Input, Select, Space, Typography } from "antd";
import { useTranslation } from "react-i18next";
import { useAdminDashboardContext } from "@apps/admin/features/Dashboard/context/useAdminDashboardContext";
import type {
  AdminSettingsFormValues,
  CompanyFormValues,
} from "@apps/admin/features/Dashboard/types";

export const SettingsPage = () => {
  const { t } = useTranslation();
  const { dashboard, actions } = useAdminDashboardContext();

  const companies: AdminCompany[] = dashboard.companies;
  const companyForm: FormInstance<CompanyFormValues> = dashboard.companyForm;
  const adminSettingsForm: FormInstance<AdminSettingsFormValues> =
    dashboard.adminSettingsForm;

  return (
    <Space direction="vertical" size={16} style={{ width: "100%" }}>
      <Typography.Title level={5} style={{ marginBottom: 0 }}>
        {t("admin.settings.companyTitle")}
      </Typography.Title>
      <Form
        layout="vertical"
        form={companyForm}
        onFinish={actions.submitCompany}
      >
        <Form.Item
          name="name"
          label={t("admin.companies.name")}
          rules={[{ required: true }]}
        >
          <Input />
        </Form.Item>
        <Form.Item
          name="timezone"
          label={t("admin.companies.timezone")}
          rules={[{ required: true }]}
        >
          <Input />
        </Form.Item>
        <Button
          type="primary"
          htmlType="submit"
          loading={dashboard.updateCompanyMutation.isPending}
        >
          {t("admin.settings.saveCompany")}
        </Button>
      </Form>

      <Typography.Title level={5} style={{ marginBottom: 0 }}>
        {t("admin.settings.adminTitle")}
      </Typography.Title>
      <Form
        layout="vertical"
        form={adminSettingsForm}
        onFinish={actions.submitAdminSettings}
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
          label={t("admin.settings.newPassword")}
          rules={[{ min: 6 }]}
        >
          <Input.Password />
        </Form.Item>
        <Form.Item name="preferred_language" label="Язык интерфейса">
          <Select
            options={[
              { label: "Русский", value: "ru" },
              { label: "English", value: "en" },
            ]}
          />
        </Form.Item>
        <Button
          type="primary"
          htmlType="submit"
          loading={dashboard.updateAdminSettingsMutation.isPending}
        >
          {t("admin.settings.saveAdmin")}
        </Button>
      </Form>

      {!companies.length && (
        <Typography.Text type="secondary">
          {t("admin.common.unknownCompany")}
        </Typography.Text>
      )}
    </Space>
  );
};
