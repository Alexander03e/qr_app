import { Typography } from "antd";
import { useTranslation } from "react-i18next";

export interface SimpleBarChartItem {
  label: string;
  value: number;
}

interface SimpleBarChartProps {
  data: SimpleBarChartItem[];
  suffix?: string;
}

export const SimpleBarChart = ({ data, suffix = "" }: SimpleBarChartProps) => {
  const { t } = useTranslation();
  const maxValue = Math.max(...data.map((item) => item.value), 0);

  if (!data.length || maxValue <= 0) {
    return (
      <Typography.Text type="secondary">
        {t("admin.metrics.chartEmpty")}
      </Typography.Text>
    );
  }

  return (
    <div style={{ display: "grid", gap: 8 }}>
      {data.map((item) => {
        const width = `${Math.max((item.value / maxValue) * 100, 2)}%`;

        return (
          <div
            key={item.label}
            style={{
              display: "grid",
              gridTemplateColumns:
                "minmax(56px, 88px) minmax(80px, 1fr) minmax(48px, 72px)",
              alignItems: "center",
              gap: 10,
            }}
          >
            <Typography.Text ellipsis>{item.label}</Typography.Text>
            <div
              style={{
                height: 14,
                borderRadius: 4,
                background: "rgba(0, 0, 0, 0.06)",
                overflow: "hidden",
              }}
            >
              <div
                style={{
                  width,
                  height: "100%",
                  background: "var(--primary-color)",
                }}
              />
            </div>
            <Typography.Text>
              {item.value}
              {suffix}
            </Typography.Text>
          </div>
        );
      })}
    </div>
  );
};
