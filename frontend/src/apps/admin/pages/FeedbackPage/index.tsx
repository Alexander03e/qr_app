import type { AdminFeedbackItem } from "@shared/entities/admin/types";
import {
  feedbackStatusColors,
  feedbackTypeColors,
} from "@apps/admin/features/Dashboard/constants";
import {
  Button,
  Flex,
  Modal,
  Popconfirm,
  Rate,
  Space,
  Table,
  Tag,
  Typography,
} from "antd";
import type { ColumnsType } from "antd/es/table";
import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import { makeRequest } from "@shared/helper/handler";

import { useAdminDashboardContext } from "@apps/admin/features/Dashboard/context/useAdminDashboardContext";
import i18n from "@shared/config/i18n";
import { QuestionCircleOutlined } from "@ant-design/icons";

export const FeedbackPage = () => {
  const { t } = useTranslation();
  const { dashboard } = useAdminDashboardContext();

  const branchNameById = useMemo(
    () => new Map(dashboard.branches.map((branch) => [branch.id, branch.name])),
    [dashboard.branches],
  );
  const queueNameById = useMemo(
    () => new Map(dashboard.queues.map((queue) => [queue.id, queue.name])),
    [dashboard.queues],
  );

  const feedbackValueTranslate = useMemo(
    () => ({
      FEEDBACK: t("client.feedback.types.FEEDBACK"),
      COMPLAINT: t("client.feedback.types.COMPLAINT"),
    }),
    [t],
  );
  const columns: ColumnsType<AdminFeedbackItem> = useMemo(
    () => [
      { title: "ID", dataIndex: "id", key: "id", width: 80 },
      {
        title: t("admin.feedback.type"),
        dataIndex: "type",
        key: "type",
        render: (value: AdminFeedbackItem["type"]) => (
          <Tag color={feedbackTypeColors[value]}>
            {feedbackValueTranslate[value]}
          </Tag>
        ),
      },
      {
        title: t("admin.feedback.timestamp"),
        key: "timestamp",
        render: (_, row) => (
          <>
            {new Date(row.created_at).toLocaleString(i18n.language, {
              year: "numeric",
              month: "2-digit",
              day: "2-digit",
              hour: "2-digit",
              minute: "2-digit",
            })}
          </>
        ),
      },
      {
        title: t("admin.feedback.rating"),
        dataIndex: "rating",
        key: "rating",
        width: 160,
        render: (value: number | null) =>
          value ? <Rate size="small" disabled value={value} /> : "-",
      },
      {
        title: t("admin.feedback.message"),
        dataIndex: "message",
        key: "message",
        width: 5,
        render: (value: string) => (
          <Flex
            gap={6}
            align="center"
            style={{ cursor: "pointer" }}
            onClick={() =>
              Modal.info({
                content: value,
                icon: null,
                closeIcon: true,
                width: 600,
                closable: true,
                centered: true,
                maskClosable: true,
              })
            }
          >
            <Typography.Paragraph
              title="none"
              style={{ margin: 0, maxWidth: 120 }}
              ellipsis={{ rows: 1, tooltip: value }}
            >
              {value}
            </Typography.Paragraph>

            <QuestionCircleOutlined />
          </Flex>
        ),
      },
      {
        title: t("admin.feedback.status"),
        dataIndex: "status",
        key: "status",
        render: (value: AdminFeedbackItem["status"]) => (
          <Tag color={feedbackStatusColors[value]}>{value}</Tag>
        ),
      },
      {
        title: t("admin.feedback.branch"),
        dataIndex: "branch",
        key: "branch",
        render: (value: number | null) =>
          value ? (branchNameById.get(value) ?? value) : "-",
      },
      {
        title: t("admin.feedback.queue"),
        dataIndex: "queue",
        key: "queue",
        render: (value: number | null) =>
          value ? (queueNameById.get(value) ?? value) : "-",
      },
      {
        title: t("admin.common.actions"),
        key: "actions",
        render: (_, row) => (
          <Space>
            <Popconfirm
              title={t("admin.common.deleteConfirm")}
              onConfirm={() =>
                makeRequest(
                  dashboard.deleteFeedbackMutation.mutateAsync(row.id),
                )
              }
            >
              <Button danger size="small">
                {t("admin.common.delete")}
              </Button>
            </Popconfirm>
          </Space>
        ),
      },
    ],
    [
      branchNameById,
      feedbackValueTranslate,
      dashboard.deleteFeedbackMutation,
      queueNameById,
      t,
    ],
  );

  return (
    <>
      <Table
        rowKey="id"
        loading={dashboard.feedbackLoading}
        columns={columns}
        dataSource={dashboard.feedback}
        pagination={false}
        scroll={{ x: "max-content" }}
      />
    </>
  );
};
