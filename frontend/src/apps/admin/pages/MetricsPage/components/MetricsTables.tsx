import type { AdminMetrics } from "@shared/entities/admin/types";
import { Badge, Rate, Space, Table, Typography } from "antd";
import type { ColumnsType } from "antd/es/table";
import { useMemo } from "react";
import { useTranslation } from "react-i18next";

interface MetricsTablesProps {
  metrics?: AdminMetrics;
}

const seconds = (value: number) => `${Math.round(value)} c`;
const percent = (value: number) => `${value}%`;

export const MetricsTables = ({ metrics }: MetricsTablesProps) => {
  const { t } = useTranslation();
  const business = metrics?.business;

  const queueColumns = useMemo<ColumnsType<AdminMetrics["business"]["queues"][number]>>(
    () => [
      { title: t("admin.metrics.queue"), dataIndex: "queue_name", key: "queue_name" },
      {
        title: t("admin.metrics.branch"),
        dataIndex: "branch_name",
        key: "branch_name",
        render: (value: string | null) => value ?? "-",
      },
      { title: t("admin.metrics.activeTickets"), dataIndex: "active_tickets", key: "active_tickets" },
      { title: t("admin.metrics.completed"), dataIndex: "completed_tickets", key: "completed_tickets" },
      {
        title: t("admin.metrics.leftRate"),
        dataIndex: "left_rate_percent",
        key: "left_rate_percent",
        render: percent,
      },
      {
        title: t("admin.metrics.avgWait"),
        dataIndex: "avg_wait_seconds",
        key: "avg_wait_seconds",
        render: seconds,
      },
      {
        title: t("admin.metrics.avgService"),
        dataIndex: "avg_service_seconds",
        key: "avg_service_seconds",
        render: seconds,
      },
      {
        title: t("admin.metrics.load"),
        dataIndex: "load_percent",
        key: "load_percent",
        render: percent,
      },
      {
        title: t("admin.metrics.avgRating"),
        dataIndex: "avg_rating",
        key: "avg_rating",
        render: (value: number) => <Rate allowHalf disabled value={value} />,
      },
    ],
    [t],
  );

  const branchColumns = useMemo<
    ColumnsType<AdminMetrics["business"]["branches"][number]>
  >(
    () => [
      { title: t("admin.metrics.branch"), dataIndex: "branch_name", key: "branch_name" },
      { title: t("admin.stats.queues"), dataIndex: "queue_count", key: "queue_count" },
      { title: t("admin.metrics.activeTickets"), dataIndex: "active_tickets", key: "active_tickets" },
      { title: t("admin.metrics.completed"), dataIndex: "completed_tickets", key: "completed_tickets" },
      {
        title: t("admin.metrics.load"),
        dataIndex: "load_percent",
        key: "load_percent",
        render: percent,
      },
      {
        title: t("admin.metrics.slaWait"),
        dataIndex: "sla_wait_under_10_min_percent",
        key: "sla_wait_under_10_min_percent",
        render: percent,
      },
      {
        title: t("admin.metrics.avgRating"),
        dataIndex: "avg_rating",
        key: "avg_rating",
        render: (value: number) => <Rate allowHalf disabled value={value} />,
      },
    ],
    [t],
  );

  const operatorColumns = useMemo<
    ColumnsType<AdminMetrics["business"]["operators"][number]>
  >(
    () => [
      { title: t("admin.metrics.operator"), dataIndex: "operator_name", key: "operator_name" },
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
        title: t("admin.metrics.branch"),
        dataIndex: "branch_name",
        key: "branch_name",
        render: (value: string | null) => value ?? "-",
      },
      { title: t("admin.stats.queues"), dataIndex: "queue_count", key: "queue_count" },
      { title: t("admin.metrics.waiting"), dataIndex: "waiting_tickets", key: "waiting_tickets" },
      { title: t("admin.metrics.activeTickets"), dataIndex: "active_tickets", key: "active_tickets" },
      { title: t("admin.metrics.completed"), dataIndex: "completed_tickets", key: "completed_tickets" },
      {
        title: t("admin.metrics.avgService"),
        dataIndex: "avg_service_seconds",
        key: "avg_service_seconds",
        render: seconds,
      },
      {
        title: t("admin.metrics.avgRating"),
        dataIndex: "avg_rating",
        key: "avg_rating",
        render: (value: number) => <Rate allowHalf disabled value={value} />,
      },
    ],
    [t],
  );

  return (
    <Space direction="vertical" size={18} style={{ width: "100%" }}>
      <Typography.Title level={5} style={{ marginBottom: 0 }}>
        {t("admin.metrics.branchReport")}
      </Typography.Title>
      <Table
        rowKey="branch_id"
        columns={branchColumns}
        dataSource={business?.branches ?? []}
        pagination={false}
        scroll={{ x: "max-content" }}
      />

      <Typography.Title level={5} style={{ marginBottom: 0 }}>
        {t("admin.metrics.queueReport")}
      </Typography.Title>
      <Table
        rowKey="queue_id"
        columns={queueColumns}
        dataSource={business?.queues ?? []}
        pagination={false}
        scroll={{ x: "max-content" }}
      />

      <Typography.Title level={5} style={{ marginBottom: 0 }}>
        {t("admin.metrics.operatorReport")}
      </Typography.Title>
      <Table
        rowKey="operator_id"
        columns={operatorColumns}
        dataSource={business?.operators ?? []}
        pagination={false}
        scroll={{ x: "max-content" }}
      />

    </Space>
  );
};
