import {
  Button,
  Form,
  Input,
  Rate,
  Segmented,
  Typography,
  message as antdMessage,
} from "antd";
import { useTranslation } from "react-i18next";
import { useMutation } from "@tanstack/react-query";
import { makeRequest } from "@shared/helper/handler";
import { feedbackMutationOptions } from "@shared/entities/feedback/api/mutations";
import type { ClientFeedbackType } from "@shared/entities/feedback/types";
import { useState } from "react";
import styles from "./FeedbackForm.module.scss";

type FeedbackOrigin = "completed" | "left";

interface FeedbackFormValues {
  type: ClientFeedbackType;
  rating?: number;
  message: string;
}

interface FeedbackFormProps {
  queueId: number;
  ticketId?: number | null;
  origin: FeedbackOrigin;
}

export const FeedbackForm = ({ queueId, ticketId, origin }: FeedbackFormProps) => {
  const { t } = useTranslation();
  const [form] = Form.useForm<FeedbackFormValues>();
  const [isSubmitted, setIsSubmitted] = useState(false);

  const { mutateAsync: createFeedback, isPending } = useMutation(
    feedbackMutationOptions.createClientFeedback({
      onSuccess: () => {
        setIsSubmitted(true);
        form.resetFields();
        antdMessage.success(t("client.feedback.success"));
      },
    }),
  );

  const handleSubmit = async (values: FeedbackFormValues) => {
    await makeRequest(
      createFeedback({
        queue_id: queueId,
        ticket_id: ticketId ?? null,
        type: values.type,
        title: t(`client.feedback.generatedTitle.${origin}`),
        message: values.message,
        rating: values.rating ?? null,
      }),
    );
  };

  if (isSubmitted) {
    return (
      <div className={styles.done}>
        <Typography.Text>{t("client.feedback.done")}</Typography.Text>
      </div>
    );
  }

  return (
    <div className={styles.wrapper}>
      <Typography.Title level={4} className={styles.title}>
        {t("client.feedback.title")}
      </Typography.Title>
      <Form
        form={form}
        layout="vertical"
        initialValues={{ type: "FEEDBACK" }}
        onFinish={handleSubmit}
      >
        <Form.Item name="type" label={t("client.feedback.type")}>
          <Segmented
            block
            options={[
              { label: t("client.feedback.types.FEEDBACK"), value: "FEEDBACK" },
              { label: t("client.feedback.types.COMPLAINT"), value: "COMPLAINT" },
            ]}
          />
        </Form.Item>
        <Form.Item name="rating" label={t("client.feedback.rating")}>
          <Rate />
        </Form.Item>
        <Form.Item
          name="message"
          label={t("client.feedback.message")}
          rules={[{ required: true, message: t("client.feedback.messageRequired") }]}
        >
          <Input.TextArea
            autoSize={{ minRows: 3, maxRows: 5 }}
            maxLength={600}
            showCount
            placeholder={t("client.feedback.messagePlaceholder")}
          />
        </Form.Item>
        <Button type="primary" htmlType="submit" loading={isPending} block>
          {t("client.feedback.submit")}
        </Button>
      </Form>
    </div>
  );
};
