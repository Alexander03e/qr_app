import type { AdminFeedbackItem } from "@shared/entities/admin/types";
import {
  feedbackStatusColors,
  feedbackTypeColors,
} from "@apps/admin/features/Dashboard/constants";
import { PlusOutlined } from "@ant-design/icons";
import { Button, Popconfirm, Space, Table, Tag } from "antd";
import type { ColumnsType } from "antd/es/table";
import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import { makeRequest } from "@shared/helper/handler";

import { useAdminDashboardContext } from "@apps/admin/features/Dashboard/context/useAdminDashboardContext";

export const FeedbackPage = () => {
  const { t } = useTranslation();
  const { dashboard, actions } = useAdminDashboardContext();

  const columns: ColumnsType<AdminFeedbackItem> = useMemo(
    () => [
      { title: "ID", dataIndex: "id", key: "id", width: 80 },
      {
        title: t("admin.feedback.type"),
        dataIndex: "type",
        key: "type",
        render: (value: AdminFeedbackItem["type"]) => (
          <Tag color={feedbackTypeColors[value]}>{value}</Tag>
        ),
      },
      { title: t("admin.feedback.title"), dataIndex: "title", key: "title" },
      {
        title: t("admin.feedback.status"),
        dataIndex: "status",
        key: "status",
        render: (value: AdminFeedbackItem["status"]) => (
          <Tag color={feedbackStatusColors[value]}>{value}</Tag>
        ),
      },
      { title: t("admin.feedback.branch"), dataIndex: "branch", key: "branch" },
      { title: t("admin.feedback.queue"), dataIndex: "queue", key: "queue" },
      {
        title: t("admin.common.actions"),
        key: "actions",
        render: (_, row) => (
          <Space>
            <Button size="small" onClick={() => actions.openEditFeedback(row)}>
              {t("admin.feedback.edit")}
            </Button>
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
    [actions, dashboard, t],
  );

  return (
    <>
      <Space style={{ marginBottom: 12 }}>
        <Button
          type="primary"
          icon={<PlusOutlined />}
          onClick={actions.openCreateFeedback}
        >
          {t("admin.feedback.add")}
        </Button>
      </Space>
      <Table
        rowKey="id"
        loading={dashboard.feedbackLoading}
        columns={columns}
        dataSource={dashboard.feedback}
        pagination={false}
      />
    </>
  );
};
