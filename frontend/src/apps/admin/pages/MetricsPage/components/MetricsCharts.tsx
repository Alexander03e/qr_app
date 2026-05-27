import type { AdminMetrics } from "@shared/entities/admin/types";
import { Space, Typography } from "antd";
import { useTranslation } from "react-i18next";
import { SimpleBarChart } from "./SimpleBarChart";

interface MetricsChartsProps {
  metrics?: AdminMetrics;
}

export const MetricsCharts = ({ metrics }: MetricsChartsProps) => {
  const { t } = useTranslation();
  const business = metrics?.business;

  const dailyData =
    business?.daily.map((item) => ({
      label: item.date.slice(5),
      value: item.total_tickets,
    })) ?? [];
  const branchLoadData =
    business?.branches.map((item) => ({
      label: item.branch_name,
      value: Math.round(item.load_percent),
    })) ?? [];
  const peakHourData =
    business?.peak_hours.map((item) => ({
      label: `${String(item.hour).padStart(2, "0")}:00`,
      value: item.tickets,
    })) ?? [];

  return (
    <Space direction="vertical" size={18} style={{ width: "100%" }}>
      <div>
        <Typography.Title level={5} style={{ marginBottom: 8 }}>
          {t("admin.metrics.dailyDynamics")}
        </Typography.Title>
        <SimpleBarChart data={dailyData} />
      </div>
      <div>
        <Typography.Title level={5} style={{ marginBottom: 8 }}>
          {t("admin.metrics.load")}
        </Typography.Title>
        <SimpleBarChart data={branchLoadData} suffix="%" />
      </div>
      <div>
        <Typography.Title level={5} style={{ marginBottom: 8 }}>
          {t("admin.metrics.peakHours")}
        </Typography.Title>
        <SimpleBarChart data={peakHourData} />
      </div>
    </Space>
  );
};
