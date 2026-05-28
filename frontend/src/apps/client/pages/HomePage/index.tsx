import { Circle } from "@apps/client/components";
import { BellOutlined } from "@ant-design/icons";
import { Label } from "@shared/components/Label";
import { Button, Flex, Typography } from "antd";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useQueueStore } from "@apps/client/store";
import { normalizeQueueNotificationChannels } from "@shared/entities/queue/notificationOptions";
import { NotificationSettingsModal } from "./components/NotificationSettingsModal";
import styles from "./HomePage.module.scss";
import { useBrowserTicketNotification } from "./hooks/useBrowserTicketNotification";
import { useClientQueueController } from "./hooks/useClientQueueController";

export const HomePage = () => {
  const { t } = useTranslation();
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const { queueData } = useQueueStore();
  const enabledNotificationChannels = normalizeQueueNotificationChannels(
    queueData?.notification_options,
  );
  const hasNotificationChannels = enabledNotificationChannels.length > 0;
  const isWebPushEnabledForQueue =
    enabledNotificationChannels.includes("webpush");
  const {
    calledTimeLeftLabel,
    clientId,
    circleTitle,
    estimatedWaitLabel,
    handleLeaveQueue,
    handleSkipOneAhead,
    isCalled,
    isInService,
    isLeaveDisabled,
    isLeavePending,
    isSkipOneAheadDisabled,
    isSkipPending,
    percent,
    queueId,
    queueName,
    ticket,
  } = useClientQueueController();

  useBrowserTicketNotification({
    enabled: isWebPushEnabledForQueue,
    queueId,
    queueName,
    ticket,
  });

  return (
    <Flex gap={16} vertical>
      <div className={styles.top}>
        <Circle
          color={isCalled || isInService ? "success" : "default"}
          progressProps={{ percent }}
          contentClassName={styles.circleContent}
        >
          <Typography.Title className={styles.title} level={3}>
            {circleTitle}
          </Typography.Title>

          <Label variant={isCalled || isInService ? "success" : "default"}>
            {ticket?.display_number}
          </Label>
          {calledTimeLeftLabel ? (
            <Typography.Text className={styles.calledTimer}>
              {calledTimeLeftLabel}
            </Typography.Text>
          ) : null}
          {estimatedWaitLabel ? (
            <Typography.Text className={styles.estimatedWait}>
              {estimatedWaitLabel}
            </Typography.Text>
          ) : null}
        </Circle>
      </div>
      <div className={styles.bottom}>
        {hasNotificationChannels ? (
          <Button
            icon={<BellOutlined />}
            onClick={() => setIsNotificationsOpen(true)}
          >
            {t("client.notifications.openButton")}
          </Button>
        ) : null}
        <Button
          type="primary"
          onClick={handleSkipOneAhead}
          loading={isSkipPending}
          disabled={isSkipOneAheadDisabled}
        >
          {t("client.homePage.skipOneAhead")}
        </Button>
        <Button
          type="default"
          danger
          onClick={handleLeaveQueue}
          loading={isLeavePending}
          disabled={isLeaveDisabled}
        >
          {t("client.homePage.leaveQueue")}
        </Button>
      </div>
      <NotificationSettingsModal
        clientId={clientId}
        open={isNotificationsOpen}
        queueId={queueId}
        ticketId={ticket?.id}
        onClose={() => setIsNotificationsOpen(false)}
      />
    </Flex>
  );
};
