import { BellOutlined, MessageOutlined } from "@ant-design/icons";
import { Alert, Button, Flex, Modal, Space, Spin, Tag, Typography } from "antd";
import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { useClientNotifications } from "../hooks/useClientNotifications";
import { useQueueStore } from "@apps/client/store";
import { normalizeQueueNotificationChannels } from "@shared/entities/queue/notificationOptions";
import styles from "./NotificationSettingsModal.module.scss";

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
  const vkButtonRef = useRef<HTMLDivElement>(null);
  const [isVkWidgetReady, setIsVkWidgetReady] = useState(false);
  const { queueData } = useQueueStore();
  const enabledChannels = normalizeQueueNotificationChannels(
    queueData?.notification_options,
  );
  const isWebPushAvailable = enabledChannels.includes("webpush");
  const isVkAvailable = enabledChannels.includes("vk");
  const hasNotificationChannels = isWebPushAvailable || isVkAvailable;
  const {
    connectVk,
    disableWebPush,
    enableWebPush,
    feedback,
    isPushEnabled,
    isPushLoading,
    isPushSupported,
    pushSupportMessage,
    isStatusLoading,
    isVkEnabled,
    isVkLoading,
    loadStatus,
    mountVkIdButton,
  } = useClientNotifications({ clientId, queueId, ticketId });

  useEffect(() => {
    if (open) {
      loadStatus();
      setIsVkWidgetReady(false);
    }
  }, [loadStatus, open]);

  useEffect(() => {
    if (!open || !isVkAvailable || !vkButtonRef.current) {
      return undefined;
    }

    return mountVkIdButton(vkButtonRef.current, {
      onReady: () => setIsVkWidgetReady(true),
    });
  }, [isVkAvailable, mountVkIdButton, open]);

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
          <Alert showIcon type={feedback.type} message={feedback.message} />
        ) : null}
        {!feedback && !hasNotificationChannels ? (
          <Alert
            showIcon
            type="info"
            message={t("client.notifications.channelsUnavailable")}
          />
        ) : null}
        {!feedback && isWebPushAvailable && pushSupportMessage ? (
          <Alert showIcon type="info" message={pushSupportMessage} />
        ) : null}

        {isWebPushAvailable ? (
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
              disabled={
                !isPushEnabled &&
                (!isPushSupported || Boolean(pushSupportMessage))
              }
              icon={<BellOutlined />}
              loading={isPushLoading}
              type="primary"
              onClick={() =>
                isPushEnabled ? void disableWebPush() : void enableWebPush()
              }
            >
              {isPushEnabled
                ? t("client.notifications.disablePush")
                : t("client.notifications.enablePush")}
            </Button>
          </Flex>
        ) : null}

        {isVkAvailable ? (
          <Flex gap={10} vertical>
            <Space align="center">
              <Typography.Text strong>
                {t("client.notifications.vkTitle")}
              </Typography.Text>
              {isVkEnabled ? (
                <Tag color="success">{t("client.notifications.enabled")}</Tag>
              ) : null}
            </Space>
            <div className={styles.vkIdButtonShell}>
              {!isVkWidgetReady ? (
                <Button
                  block
                  className={styles.vkFallbackButton}
                  icon={<MessageOutlined />}
                  loading={isVkLoading}
                  onClick={() => void connectVk()}
                >
                  {isVkEnabled
                    ? t("client.notifications.updateVk")
                    : t("client.notifications.connectVk")}
                </Button>
              ) : null}
              <div
                ref={vkButtonRef}
                className={
                  isVkWidgetReady
                    ? styles.vkIdButton
                    : styles.vkIdButtonHidden
                }
              />
              {isVkLoading ? (
                <div className={styles.vkIdLoading}>
                  <Spin size="small" />
                </div>
              ) : null}
            </div>
          </Flex>
        ) : null}
      </Flex>
    </Modal>
  );
};
