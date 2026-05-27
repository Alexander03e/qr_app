import { Typography } from "antd";
import { useTranslation } from "react-i18next";

export const GrafanaPanel = () => {
  const { t } = useTranslation();
  const grafanaUrl = import.meta.env.VITE_GRAFANA_DASHBOARD_URL as
    | string
    | undefined;

  if (!grafanaUrl) {
    return null;
  }

  return (
    <div>
      <Typography.Title level={5} style={{ marginBottom: 8 }}>
        {t("admin.metrics.grafana")}
      </Typography.Title>
      <iframe
        src={grafanaUrl}
        title={t("admin.metrics.grafana")}
        style={{
          width: "100%",
          minHeight: 460,
          border: 0,
          borderRadius: 8,
        }}
      />
    </div>
  );
};
