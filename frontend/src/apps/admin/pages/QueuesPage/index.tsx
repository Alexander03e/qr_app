import type { AdminQueue } from "@shared/entities/admin/types";
import {
  GlobalOutlined,
  InfoCircleOutlined,
  PlusOutlined,
} from "@ant-design/icons";
import { Button, Popconfirm, Space, Table, Tag } from "antd";
import type { ColumnsType } from "antd/es/table";
import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import { makeRequest } from "@shared/helper/handler";

import { useAdminDashboardContext } from "@apps/admin/features/Dashboard/context/useAdminDashboardContext";

export const QueuesPage = () => {
  const { t } = useTranslation();
  const { dashboard, actions } = useAdminDashboardContext();

  const branchNameById = useMemo(
    () => new Map(dashboard.branches.map((branch) => [branch.id, branch.name])),
    [dashboard.branches],
  );

  const columns: ColumnsType<AdminQueue> = useMemo(
    () => [
      { title: "ID", dataIndex: "id", key: "id", width: 80 },
      { title: t("admin.queues.name"), dataIndex: "name", key: "name" },
      {
        title: t("admin.queues.branch"),
        dataIndex: "branch",
        key: "branch",
        render: (value: number | null) => (value ? branchNameById.get(value) ?? value : "-"),
      },
      {
        title: "Язык",
        dataIndex: "language",
        key: "language",
        render: (value: "ru" | "en") => (
          <Tag icon={<GlobalOutlined />}>{value.toUpperCase()}</Tag>
        ),
      },
      {
        title: t("admin.queues.limit"),
        dataIndex: "clients_limit",
        key: "clients_limit",
        render: (value: number | null) => value ?? "-",
      },
      {
        title: "Таймер",
        dataIndex: "called_ticket_timeout_seconds",
        key: "called_ticket_timeout_seconds",
        render: (value: number | null) =>
          value && value > 0 ? `${value} сек` : "Выключен",
      },
      {
        title: t("admin.queues.url"),
        dataIndex: "queue_url",
        key: "queue_url",
        render: (value: string | null) => value || "-",
      },
      {
        title: t("admin.common.actions"),
        key: "actions",
        render: (_, row) => (
          <Space>
            <Button
              icon={<InfoCircleOutlined />}
              size="small"
              onClick={(event) => {
                event.stopPropagation();
                actions.openQueueDetails(row);
              }}
            />
            <Button
              size="small"
              onClick={(event) => {
                event.stopPropagation();
                actions.openEditQueue(row);
              }}
            >
              {t("admin.queues.edit")}
            </Button>
            <Popconfirm
              title={t("admin.common.deleteConfirm")}
              onConfirm={(event) => {
                event?.stopPropagation();
                return makeRequest(
                  dashboard.deleteQueueMutation.mutateAsync(row.id),
                );
              }}
            >
              <Button danger size="small">
                {t("admin.common.delete")}
              </Button>
            </Popconfirm>
          </Space>
        ),
      },
    ],
    [actions, branchNameById, dashboard, t],
  );

  return (
    <>
      <Space style={{ marginBottom: 12 }}>
        <Button
          type="primary"
          icon={<PlusOutlined />}
          onClick={actions.openCreateQueue}
        >
          {t("admin.queues.add")}
        </Button>
      </Space>
      <Table
        rowKey="id"
        loading={dashboard.queuesLoading}
        columns={columns}
        dataSource={dashboard.queues}
        pagination={false}
        onRow={(row) => ({
          onClick: () => actions.openQueueDetails(row),
        })}
      />
    </>
  );
};
