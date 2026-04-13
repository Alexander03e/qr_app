import { adminAuth } from "@apps/admin/helpers/auth";
import { makeRequest } from "@shared/helper/handler";
import { Button, Card, Form, Input, Typography, message } from "antd";
import { useMutation } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { useNavigate, useSearchParams } from "react-router-dom";

export const AdminLogin = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const { mutateAsync, isPending } = useMutation({
    mutationFn: async (payload: { email: string; password: string }) =>
      adminAuth.login(payload.email, payload.password),
  });

  const onFinish = async (values: { email: string; password: string }) => {
    try {
      const response = await makeRequest(mutateAsync(values));
      adminAuth.writeToken(response.token);
      const redirectTo = searchParams.get("next") ?? "/a";
      navigate(redirectTo, { replace: true });
    } catch {
      message.error(t("admin.login.invalid"));
    }
  };

  return (
    <Card style={{ width: 420, margin: "56px auto" }}>
      <Typography.Title level={3}>{t("admin.login.title")}</Typography.Title>
      <Form layout="vertical" onFinish={onFinish}>
        <Form.Item
          name="email"
          label={t("admin.login.email")}
          rules={[{ required: true, type: "email" }]}
        >
          <Input placeholder="admin@example.com" />
        </Form.Item>
        <Form.Item
          name="password"
          label={t("admin.login.password")}
          rules={[{ required: true, min: 6 }]}
        >
          <Input.Password />
        </Form.Item>
        <Button htmlType="submit" type="primary" block loading={isPending}>
          {t("admin.login.submit")}
        </Button>
      </Form>
    </Card>
  );
};
