import type { AdminBranch } from "@shared/entities/admin/types";
import { PlusOutlined } from "@ant-design/icons";
import {
  Badge,
  Button,
  Popconfirm,
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

export const BranchesPage = () => {
  const { t } = useTranslation();
  const { dashboard, actions } = useAdminDashboardContext();

  const queueCountByBranch = useMemo(() => {
    const map = new Map<number, number>();
    dashboard.queues.forEach((queue) => {
      if (queue.branch) {
        map.set(queue.branch, (map.get(queue.branch) ?? 0) + 1);
      }
    });
    return map;
  }, [dashboard.queues]);

  const operatorCountByBranch = useMemo(() => {
    const map = new Map<number, number>();
    dashboard.operators.forEach((operator) => {
      if (operator.branch) {
        map.set(operator.branch, (map.get(operator.branch) ?? 0) + 1);
      }
    });
    return map;
  }, [dashboard.operators]);

  const columns: ColumnsType<AdminBranch> = useMemo(
    () => [
      { title: "ID", dataIndex: "id", key: "id", width: 80 },
      { title: t("admin.branches.name"), dataIndex: "name", key: "name" },
      {
        title: t("admin.branches.address"),
        dataIndex: "address",
        key: "address",
      },
      {
        title: t("admin.branches.status"),
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
        title: t("admin.stats.queues"),
        key: "queues",
        render: (_, row) => <Tag>{queueCountByBranch.get(row.id) ?? 0}</Tag>,
      },
      {
        title: t("admin.stats.operators"),
        key: "operators",
        render: (_, row) => <Tag>{operatorCountByBranch.get(row.id) ?? 0}</Tag>,
      },
      {
        title: t("admin.common.actions"),
        key: "actions",
        render: (_, row) => (
          <Space>
            <Button size="small" onClick={() => actions.openEditBranch(row)}>
              {t("admin.branches.edit")}
            </Button>
            <Popconfirm
              title={t("admin.common.deleteConfirm")}
              onConfirm={() =>
                makeRequest(dashboard.deleteBranchMutation.mutateAsync(row.id))
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
    [actions, dashboard, operatorCountByBranch, queueCountByBranch, t],
  );

  return (
    <>
      <Space wrap style={{ marginBottom: 12 }}>
        <Button
          type="primary"
          icon={<PlusOutlined />}
          onClick={actions.openCreateBranch}
        >
          {t("admin.branches.add")}
        </Button>
        {!dashboard.companies.length && (
          <Typography.Text type="secondary">
            {t("admin.common.unknownCompany")}
          </Typography.Text>
        )}
      </Space>
      <Table
        rowKey="id"
        loading={dashboard.branchesLoading}
        columns={columns}
        dataSource={dashboard.branches}
        pagination={false}
        scroll={{ x: "max-content" }}
      />
    </>
  );
};
