import { Circle } from "@apps/client/components";
import { Label } from "@shared/components/Label";
import { Button, Flex, Typography } from "antd";
import { useTranslation } from "react-i18next";
import styles from "./HomePage.module.scss";
import { useClientQueueController } from "./hooks/useClientQueueController";

export const HomePage = () => {
  const { t } = useTranslation();
  const {
    calledTimeLeftLabel,
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
    ticket,
  } = useClientQueueController();

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
    </Flex>
  );
};
