import { useAdminDashboardContext } from "@apps/admin/features/Dashboard/context/useAdminDashboardContext";
import { GrafanaPanel } from "@apps/admin/pages/MetricsPage/components/GrafanaPanel";
import { MetricCards } from "@apps/admin/pages/MetricsPage/components/MetricCards";
import { MetricsCharts } from "@apps/admin/pages/MetricsPage/components/MetricsCharts";
import { MetricsFiltersPanel } from "@apps/admin/pages/MetricsPage/components/MetricsFiltersPanel";
import { MetricsTables } from "@apps/admin/pages/MetricsPage/components/MetricsTables";
import { adminQueryOptions } from "@shared/entities/admin/api/queries";
import type { AdminMetricsFilters } from "@shared/entities/admin/types";
import { useQuery } from "@tanstack/react-query";
import { Space } from "antd";
import { useState } from "react";

const emptyFilters: AdminMetricsFilters = {};

export const MetricsPage = () => {
  const { dashboard } = useAdminDashboardContext();
  const [filters, setFilters] = useState<AdminMetricsFilters>(emptyFilters);
  const { data: metrics } = useQuery(adminQueryOptions.metrics(filters));
  const resolvedMetrics = metrics ?? dashboard.metrics;

  return (
    <Space direction="vertical" size={18} style={{ width: "100%" }}>
      <MetricsFiltersPanel
        branches={dashboard.branches}
        filters={filters}
        operators={dashboard.operators}
        queues={dashboard.queues}
        onChange={setFilters}
        onReset={() => setFilters(emptyFilters)}
      />
      <MetricCards metrics={resolvedMetrics} />
      <GrafanaPanel />
      <MetricsCharts metrics={resolvedMetrics} />
      <MetricsTables metrics={resolvedMetrics} />
    </Space>
  );
};
