import type { AdminMetrics } from "@shared/entities/admin/types";
import { Badge, Space, Statistic, Table, Typography } from "antd";
import type { ColumnsType } from "antd/es/table";
import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import { useAdminDashboardContext } from "@apps/admin/features/Dashboard/context/useAdminDashboardContext";

export const MetricsPage = () => {
  const { t } = useTranslation();
  const { dashboard } = useAdminDashboardContext();
  const business = dashboard.metrics?.business;

  const endpointColumns = useMemo<ColumnsType<AdminMetrics["endpoints"][number]>>(
    () => [
      {
        title: t("admin.metrics.method"),
        dataIndex: "method",
        key: "method",
        width: 120,
      },
      {
        title: t("admin.metrics.endpoint"),
        dataIndex: "endpoint",
        key: "endpoint",
      },
      {
        title: t("admin.metrics.requests"),
        dataIndex: "requests",
        key: "requests",
        width: 140,
      },
    ],
    [t],
  );

  const queueColumns = useMemo<ColumnsType<AdminMetrics["business"]["queues"][number]>>(
    () => [
      {
        title: t("admin.metrics.queue"),
        dataIndex: "queue_name",
        key: "queue_name",
      },
      {
        title: t("admin.metrics.branch"),
        dataIndex: "branch_name",
        key: "branch_name",
        render: (value: string | null) => value ?? "-",
      },
      {
        title: t("admin.metrics.waiting"),
        dataIndex: "waiting_tickets",
        key: "waiting_tickets",
        width: 120,
      },
      {
        title: t("admin.metrics.completed"),
        dataIndex: "completed_tickets",
        key: "completed_tickets",
        width: 130,
      },
      {
        title: t("admin.metrics.notArrived"),
        dataIndex: "not_arrived_tickets",
        key: "not_arrived_tickets",
        width: 120,
      },
      {
        title: t("admin.metrics.avgWait"),
        dataIndex: "avg_wait_seconds",
        key: "avg_wait_seconds",
        width: 130,
        render: (value: number) => `${Math.round(value)} c`,
      },
      {
        title: t("admin.metrics.avgService"),
        dataIndex: "avg_service_seconds",
        key: "avg_service_seconds",
        width: 150,
        render: (value: number) => `${Math.round(value)} c`,
      },
    ],
    [t],
  );

  const operatorColumns = useMemo<
    ColumnsType<AdminMetrics["business"]["operators"][number]>
  >(
    () => [
      {
        title: t("admin.metrics.operator"),
        dataIndex: "operator_name",
        key: "operator_name",
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
        title: t("admin.stats.queues"),
        dataIndex: "queue_count",
        key: "queue_count",
      },
      {
        title: t("admin.metrics.waiting"),
        dataIndex: "waiting_tickets",
        key: "waiting_tickets",
      },
      {
        title: t("admin.metrics.activeTickets"),
        dataIndex: "active_tickets",
        key: "active_tickets",
      },
    ],
    [t],
  );

  const peakHourColumns = useMemo<
    ColumnsType<AdminMetrics["business"]["peak_hours"][number]>
  >(
    () => [
      {
        title: t("admin.metrics.hour"),
        dataIndex: "hour",
        key: "hour",
        render: (value: number) => `${String(value).padStart(2, "0")}:00`,
      },
      {
        title: t("admin.metrics.tickets"),
        dataIndex: "tickets",
        key: "tickets",
      },
    ],
    [t],
  );

  return (
    <Space direction="vertical" size={18} style={{ width: "100%" }}>
      <Space size={16} wrap>
        <Statistic
          title={t("admin.metrics.activeTickets")}
          value={business?.active_tickets ?? 0}
        />
        <Statistic
          title={t("admin.metrics.completed")}
          value={business?.completed_tickets ?? 0}
        />
        <Statistic
          title={t("admin.metrics.notArrived")}
          value={business?.not_arrived_tickets ?? 0}
        />
        <Statistic
          title={t("admin.metrics.leftTickets")}
          value={business?.left_tickets ?? 0}
        />
        <Statistic
          title={t("admin.metrics.avgWait")}
          value={Math.round(business?.avg_wait_seconds ?? 0)}
          suffix="с"
        />
        <Statistic
          title={t("admin.metrics.avgService")}
          value={Math.round(business?.avg_service_seconds ?? 0)}
          suffix="с"
        />
        <Statistic
          title={t("admin.metrics.totalRequests")}
          value={dashboard.metrics?.total_requests ?? 0}
        />
        <Statistic
          title={t("admin.metrics.errorRequests")}
          value={dashboard.metrics?.error_requests ?? 0}
        />
        <Statistic
          title={t("admin.metrics.avgLatency")}
          value={dashboard.metrics?.avg_latency_ms ?? 0}
          suffix="ms"
        />
      </Space>

      <Typography.Title level={5} style={{ marginBottom: 0 }}>
        {t("admin.metrics.queueReport")}
      </Typography.Title>
      <Table
        rowKey="queue_id"
        columns={queueColumns}
        dataSource={business?.queues ?? []}
        pagination={false}
      />

      <Typography.Title level={5} style={{ marginBottom: 0 }}>
        {t("admin.metrics.operatorReport")}
      </Typography.Title>
      <Table
        rowKey="operator_id"
        columns={operatorColumns}
        dataSource={business?.operators ?? []}
        pagination={false}
      />

      <Typography.Title level={5} style={{ marginBottom: 0 }}>
        {t("admin.metrics.peakHours")}
      </Typography.Title>
      <Table
        rowKey="hour"
        columns={peakHourColumns}
        dataSource={business?.peak_hours ?? []}
        pagination={false}
      />

      <Typography.Title level={5} style={{ marginBottom: 0 }}>
        {t("admin.metrics.technicalReport")}
      </Typography.Title>
      <Table
        rowKey={(row) => `${row.method}:${row.endpoint}`}
        columns={endpointColumns}
        dataSource={dashboard.metrics?.endpoints ?? []}
        pagination={false}
      />
    </Space>
  );
};
