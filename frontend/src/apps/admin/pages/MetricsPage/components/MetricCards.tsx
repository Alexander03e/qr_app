import type { AdminMetrics } from "@shared/entities/admin/types";
import { Rate, Space, Statistic } from "antd";
import { useTranslation } from "react-i18next";

interface MetricCardsProps {
  metrics?: AdminMetrics;
}

export const MetricCards = ({ metrics }: MetricCardsProps) => {
  const { t } = useTranslation();
  const business = metrics?.business;

  return (
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
        title={t("admin.metrics.leftRate")}
        value={business?.left_rate_percent ?? 0}
        suffix="%"
      />
      <Statistic
        title={t("admin.metrics.notArrivedRate")}
        value={business?.not_arrived_rate_percent ?? 0}
        suffix="%"
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
        title={t("admin.metrics.load")}
        value={business?.load_percent ?? 0}
        suffix="%"
      />
      <Statistic
        title={t("admin.metrics.throughput")}
        value={business?.throughput_per_hour ?? 0}
      />
      <Statistic
        title={t("admin.metrics.avgRating")}
        valueRender={() => (
          <Rate
            allowHalf
            disabled
            value={business?.avg_rating ?? 0}
            style={{ fontSize: 16 }}
          />
        )}
        value={business?.avg_rating ?? 0}
      />
      <Statistic
        title={t("admin.metrics.complaintRate")}
        value={business?.complaint_rate_percent ?? 0}
        suffix="%"
      />
    </Space>
  );
};
