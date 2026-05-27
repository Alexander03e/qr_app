import { BellOutlined, MessageOutlined } from "@ant-design/icons";
import { Alert, Button, Flex, Modal, Space, Spin, Tag, Typography } from "antd";
import { useEffect } from "react";
import { useTranslation } from "react-i18next";
import { useClientNotifications } from "../hooks/useClientNotifications";

interface NotificationSettingsModalProps {
  clientId: string | null;
  open: boolean;
  queueId: number | null;
  ticketId?: number;
  onClose: () => void;
}

export const NotificationSettingsModal = ({
  clientId,
  open,
  queueId,
  ticketId,
  onClose,
}: NotificationSettingsModalProps) => {
  const { t } = useTranslation();
  const {
    connectVk,
    enableWebPush,
    feedback,
    isPushEnabled,
    isPushLoading,
    isPushSupported,
    isStatusLoading,
    isVkEnabled,
    isVkLoading,
    loadStatus,
  } = useClientNotifications({ clientId, queueId, ticketId });

  useEffect(() => {
    if (open) {
      void loadStatus();
    }
  }, [loadStatus, open]);

  return (
    <Modal
      centered
      destroyOnHidden
      footer={null}
      open={open}
      title={t("client.notifications.title")}
      onCancel={onClose}
    >
      <Flex gap={16} vertical>
        {isStatusLoading ? <Spin /> : null}
        {feedback ? (
          <Alert
            showIcon
            type={feedback.type}
            message={feedback.message}
          />
        ) : null}

        <Flex gap={10} vertical>
          <Space align="center">
            <Typography.Text strong>
              {t("client.notifications.pushTitle")}
            </Typography.Text>
            {isPushEnabled ? (
              <Tag color="success">{t("client.notifications.enabled")}</Tag>
            ) : null}
          </Space>
          <Button
            block
            disabled={!isPushSupported || isPushEnabled}
            icon={<BellOutlined />}
            loading={isPushLoading}
            type="primary"
            onClick={enableWebPush}
          >
            {isPushEnabled
              ? t("client.notifications.pushEnabledShort")
              : t("client.notifications.enablePush")}
          </Button>
        </Flex>

        <Flex gap={10} vertical>
          <Space align="center">
            <Typography.Text strong>
              {t("client.notifications.vkTitle")}
            </Typography.Text>
            {isVkEnabled ? (
              <Tag color="success">{t("client.notifications.enabled")}</Tag>
            ) : null}
          </Space>
          <Button
            block
            icon={<MessageOutlined />}
            loading={isVkLoading}
            onClick={() => void connectVk()}
          >
            {isVkEnabled
              ? t("client.notifications.updateVk")
              : t("client.notifications.connectVk")}
          </Button>
        </Flex>
      </Flex>
    </Modal>
  );
};
