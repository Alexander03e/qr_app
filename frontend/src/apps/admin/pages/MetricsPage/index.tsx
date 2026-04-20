import type { AdminMetrics } from "@shared/entities/admin/types";
import { Space, Statistic, Table } from "antd";
import type { ColumnsType } from "antd/es/table";
import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import { useAdminDashboardContext } from "@apps/admin/features/Dashboard/context/useAdminDashboardContext";

export const MetricsPage = () => {
  const { t } = useTranslation();
  const { dashboard } = useAdminDashboardContext();

  const columns = useMemo<ColumnsType<AdminMetrics["endpoints"][number]>>(
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

  return (
    <>
      <Space size={16} style={{ marginBottom: 16 }}>
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
      <Table
        rowKey={(row) => `${row.method}:${row.endpoint}`}
        columns={columns}
        dataSource={dashboard.metrics?.endpoints ?? []}
        pagination={false}
      />
    </>
  );
};
