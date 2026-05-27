import type {
  AdminBranch,
  AdminMetricsFilters,
  AdminOperator,
  AdminQueue,
} from "@shared/entities/admin/types";
import { Button, Input, Select, Space, Typography } from "antd";
import { useTranslation } from "react-i18next";

interface MetricsFiltersPanelProps {
  branches: AdminBranch[];
  filters: AdminMetricsFilters;
  operators: AdminOperator[];
  queues: AdminQueue[];
  onChange: (filters: AdminMetricsFilters) => void;
  onReset: () => void;
}

export const MetricsFiltersPanel = ({
  branches,
  filters,
  operators,
  queues,
  onChange,
  onReset,
}: MetricsFiltersPanelProps) => {
  const { t } = useTranslation();
  const filteredQueues = filters.branch_id
    ? queues.filter((queue) => queue.branch === filters.branch_id)
    : queues;

  const patchFilters = (patch: Partial<AdminMetricsFilters>) => {
    onChange({ ...filters, ...patch });
  };

  return (
    <Space direction="vertical" size={8} style={{ width: "100%" }}>
      <Typography.Title level={5} style={{ marginBottom: 0 }}>
        {t("admin.metrics.filters")}
      </Typography.Title>
      <Space size={12} wrap>
        <Select
          allowClear
          placeholder={t("admin.metrics.allBranches")}
          style={{ minWidth: 180 }}
          value={filters.branch_id}
          onChange={(value) =>
            patchFilters({ branch_id: value, queue_id: undefined })
          }
          options={branches.map((branch) => ({
            label: branch.name,
            value: branch.id,
          }))}
        />
        <Select
          allowClear
          placeholder={t("admin.metrics.allQueues")}
          style={{ minWidth: 180 }}
          value={filters.queue_id}
          onChange={(value) => patchFilters({ queue_id: value })}
          options={filteredQueues.map((queue) => ({
            label: queue.name,
            value: queue.id,
          }))}
        />
        <Select
          allowClear
          placeholder={t("admin.metrics.allOperators")}
          style={{ minWidth: 200 }}
          value={filters.operator_id}
          onChange={(value) => patchFilters({ operator_id: value })}
          options={operators.map((operator) => ({
            label: operator.fullname,
            value: operator.id,
          }))}
        />
        <Input
          type="date"
          aria-label={t("admin.metrics.from")}
          value={filters.date_from ?? ""}
          onChange={(event) => patchFilters({ date_from: event.target.value })}
          style={{ width: 160 }}
        />
        <Input
          type="date"
          aria-label={t("admin.metrics.to")}
          value={filters.date_to ?? ""}
          onChange={(event) => patchFilters({ date_to: event.target.value })}
          style={{ width: 160 }}
        />
        <Button onClick={onReset}>{t("admin.metrics.reset")}</Button>
      </Space>
    </Space>
  );
};
