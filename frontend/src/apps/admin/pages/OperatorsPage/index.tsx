import type { AdminOperator } from "@shared/entities/admin/types";
import { PlusOutlined } from "@ant-design/icons";
import {
  Badge,
  Button,
  Popconfirm,
  Space,
  Table,
  Tag,
  Tooltip,
  Typography,
} from "antd";
import type { ColumnsType } from "antd/es/table";
import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import { makeRequest } from "@shared/helper/handler";

import { useAdminDashboardContext } from "@apps/admin/features/Dashboard/context/useAdminDashboardContext";
import type { OperatorLoadInfo } from "@apps/admin/features/Dashboard/types";

export const OperatorsPage = () => {
  const { t } = useTranslation();
  const { dashboard, actions } = useAdminDashboardContext();

  const columns: ColumnsType<AdminOperator> = useMemo(
    () => [
      { title: "ID", dataIndex: "id", key: "id", width: 80 },
      {
        title: t("admin.operators.fullname"),
        dataIndex: "fullname",
        key: "fullname",
      },
      { title: t("admin.operators.email"), dataIndex: "email", key: "email" },
      {
        title: "Очереди",
        key: "queues",
        render: (_, row) =>
          row.queues.length ? (
            <Space wrap>
              {row.queues.map((queue) => (
                <Tag key={queue.id}>{queue.name}</Tag>
              ))}
            </Space>
          ) : (
            <Typography.Text type="secondary">Не назначен</Typography.Text>
          ),
      },
      {
        title: "Загруженность",
        key: "workload",
        render: (_, row) => {
          const load: OperatorLoadInfo = dashboard.resolveOperatorLoad(row);
          return (
            <Tooltip title={`Ожидают клиентов: ${load.waiting}`}>
              <Badge status={load.color} text={load.label} />
            </Tooltip>
          );
        },
      },
      {
        title: t("admin.operators.status"),
        dataIndex: "is_active",
        key: "is_active",
        render: (value: boolean) =>
          value ? (
            <Badge status="success" text={t("admin.common.active")} />
          ) : (
            <Badge status="default" text={t("admin.common.inactive")} />
          ),
      },
      {
        title: t("admin.common.actions"),
        key: "actions",
        render: (_, row) => (
          <Space>
            <Button size="small" onClick={() => actions.openEditOperator(row)}>
              {t("admin.operators.edit")}
            </Button>
            <Popconfirm
              title={t("admin.common.deleteConfirm")}
              onConfirm={() =>
                makeRequest(
                  dashboard.deleteOperatorMutation.mutateAsync(row.id),
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
          onClick={actions.openCreateOperator}
        >
          {t("admin.operators.add")}
        </Button>
      </Space>
      <Table
        rowKey="id"
        loading={dashboard.operatorsLoading}
        columns={columns}
        dataSource={dashboard.operators}
        pagination={false}
      />
    </>
  );
};
