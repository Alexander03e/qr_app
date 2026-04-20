import type { AdminOperator } from "@shared/entities/admin/types";
import { QueueSettingsPanel } from "@shared/components";
import { makeRequest } from "@shared/helper/handler";
import {
  Badge,
  Button,
  Descriptions,
  Modal,
  Select,
  Space,
  Table,
  Typography,
} from "antd";
import type { ColumnsType } from "antd/es/table";
import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";

import { useAdminDashboardContext } from "../../context/useAdminDashboardContext";

export const QueueDetailsModal = () => {
  const { t } = useTranslation();
  const { dashboard, actions } = useAdminDashboardContext();
  const navigate = useNavigate();
  const selectedQueue = dashboard.selectedQueue;

  const operatorColumns: ColumnsType<AdminOperator> = useMemo(
    () => [
      {
        title: t("admin.operators.fullname"),
        dataIndex: "fullname",
        key: "fullname",
      },
      {
        title: t("admin.operators.email"),
        dataIndex: "email",
        key: "email",
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
        title: t("admin.common.actions"),
        key: "actions",
        render: (_, row) => (
          <Space>
            <Button size="small" onClick={() => actions.openEditOperator(row)}>
              {t("admin.operators.edit")}
            </Button>
            <Button
              size="small"
              onClick={() => actions.unassignOperatorFromSelectedQueue(row)}
            >
              {t("admin.queues.unassign")}
            </Button>
          </Space>
        ),
      },
    ],
    [actions, t],
  );

  return (
    <Modal
      title={t("admin.queues.details")}
      open={dashboard.queueDetailsOpen}
      onCancel={actions.closeQueueDetails}
      footer={null}
      width={860}
    >
      {selectedQueue ? (
        <Space direction="vertical" size={16} style={{ width: "100%" }}>
          <Descriptions bordered size="small" column={1}>
            <Descriptions.Item label="ID">{selectedQueue.id}</Descriptions.Item>
            <Descriptions.Item label={t("admin.queues.name")}>
              {selectedQueue.name}
            </Descriptions.Item>
            <Descriptions.Item label={t("admin.queues.branch")}>
              {dashboard.branches.find(
                (item) => item.id === selectedQueue.branch,
              )?.name ?? "-"}
            </Descriptions.Item>
            <Descriptions.Item label={t("admin.queues.limit")}>
              {selectedQueue.clients_limit ?? "-"}
            </Descriptions.Item>
            <Descriptions.Item label={t("admin.queues.url")}>
              {selectedQueue.queue_url || "-"}
            </Descriptions.Item>
            <Descriptions.Item label={t("admin.queues.lastTicket")}>
              {selectedQueue.last_ticket_number}
            </Descriptions.Item>
            <Descriptions.Item label={t("admin.queues.createdAt")}>
              {selectedQueue.created_at}
            </Descriptions.Item>
            <Descriptions.Item label={t("admin.queues.updatedAt")}>
              {selectedQueue.updated_at}
            </Descriptions.Item>
          </Descriptions>

          <Typography.Title level={5} style={{ marginBottom: 0 }}>
            {t("admin.queues.assignedOperators")}
          </Typography.Title>
          <Space>
            <Select
              style={{ minWidth: 280 }}
              placeholder={t("admin.queues.selectOperator")}
              value={dashboard.selectedOperatorForQueue ?? undefined}
              onChange={(value) =>
                dashboard.setSelectedOperatorForQueue(value ?? null)
              }
              options={dashboard.assignableOperators.map((item) => ({
                label: `${item.fullname} (${item.email})`,
                value: item.id,
              }))}
            />
            <Button
              type="primary"
              disabled={!dashboard.selectedOperatorForQueue}
              onClick={actions.assignOperatorToSelectedQueue}
            >
              {t("admin.queues.assign")}
            </Button>
          </Space>

          <Table
            rowKey="id"
            dataSource={dashboard.selectedQueueOperators}
            pagination={false}
            columns={operatorColumns}
          />

          <Typography.Title level={5} style={{ marginBottom: 0 }}>
            Настройки очереди
          </Typography.Title>
          <QueueSettingsPanel
            queue={selectedQueue}
            loading={dashboard.updateQueueMutation.isPending}
            submitText="Сохранить настройки"
            onSubmit={(payload) => {
              makeRequest(
                dashboard.updateQueueMutation.mutateAsync({
                  id: selectedQueue.id,
                  payload,
                }),
              );
            }}
            onOpenPoster={() =>
              navigate(`/a/queues/${selectedQueue.id}/poster`)
            }
          />
        </Space>
      ) : null}
    </Modal>
  );
};
