import { Circle } from "@apps/client/components";
import { clearQueueSession, paths } from "@apps/client/helpers";
import { useQueueStore } from "@apps/client/store";
import { queueMutationOptions } from "@shared/entities/queue/api/mutations";
import { TICKET_STATUS } from "@shared/entities/queue/types/enum";
import { useMutation } from "@tanstack/react-query";
import { Button, Flex, Typography } from "antd";
import reduce from "lodash/reduce";
import styles from "./HomePage.module.scss";
import { makeRequest } from "@shared/helper/handler";
import { useNavigate } from "react-router-dom";
import { Label } from "@shared/components/Label";
import { useTranslation } from "react-i18next";
import { useEffect, useMemo, useState } from "react";
import { CLIENT_CALLED_TIMEOUT_SECONDS } from "@shared/consts";

const formatDuration = (seconds: number): string => {
  const safeValue = Math.max(seconds, 0);
  const minutes = Math.floor(safeValue / 60);
  const restSeconds = safeValue % 60;
  return `${String(minutes).padStart(2, "0")}:${String(restSeconds).padStart(2, "0")}`;
};

export const HomePage = () => {
  const { queueData, setQueue, setTicket, ticket, queueId } = useQueueStore();

  const { t } = useTranslation();

  const navigate = useNavigate();
  const { mutateAsync: appendToQueue, isPending: isAppendPending } =
    useMutation(
      queueMutationOptions.skipOneAhead({
        onSuccess: (data) => {
          setQueue(data.queue_snapshot);
          setTicket(data.ticket);
        },
      }),
    );

  const { mutateAsync: leaveQueue, isPending: isLeavePending } = useMutation(
    queueMutationOptions.updateTicketStatus({
      onSuccess: (data) => {
        navigate(paths.leftPage(queueId!));
        setQueue(data.queue_snapshot);
        setTicket(null);
        if (data.ticket.status === TICKET_STATUS.SKIPPED) {
          clearQueueSession();
        }
      },
    }),
  );

  const handleSkipOneAhead = () => {
    if (!ticket || isAppendPending) {
      return;
    }

    makeRequest(appendToQueue(ticket.id));
  };

  const handleLeaveQueue = async () => {
    if (!ticket || isLeavePending) {
      return;
    }

    try {
      await makeRequest(
        leaveQueue({
          ticketId: ticket.id,
          status: TICKET_STATUS.LEFT,
        }),
      );
    } catch {
      console.error(t("client.homePage.leaveQueueError"));
    }
  };

  const waitingCountAfterMe = reduce(
    queueData?.waiting_tickets,
    (acc, value, index) => {
      if (value.id === ticket?.id) {
        return {
          currentIndex: index,
          count: acc.count,
        };
      }
      if (acc.currentIndex === null || index < acc.currentIndex) {
        return {
          ...acc,
          count: acc.count + 1,
        };
      }
      return acc;
    },
    {
      currentIndex: null,
      count: 0,
    } as { currentIndex: number | null; count: number },
  );

  const waitingCount = waitingCountAfterMe.count;
  const isCalled = ticket?.status === TICKET_STATUS.CALLED;
  const waitingTicketsCount = queueData?.waiting_tickets?.length ?? 0;
  const isWaiting = ticket?.status === TICKET_STATUS.WAITING;

  const isSkipOneAheadDisabled =
    !ticket ||
    isAppendPending ||
    (isWaiting &&
      (waitingCountAfterMe.currentIndex === null ||
        waitingCountAfterMe.currentIndex >= waitingTicketsCount - 1)) ||
    (isCalled && waitingTicketsCount === 0);

  const initialTicketNumber =
    ticket?.initial_ticket_number ?? Math.max(waitingCount + 1, 1);

  const [currentTs, setCurrentTs] = useState<number>(() => Date.now());
  const [calledCountdownBase, setCalledCountdownBase] = useState<{
    remainingSeconds: number;
    startedAtTs: number;
  } | null>(null);

  useEffect(() => {
    const timerId = window.setInterval(() => {
      setCurrentTs(Date.now());
    }, 1000);

    return () => window.clearInterval(timerId);
  }, []);

  useEffect(() => {
    if (!isCalled) {
      setCalledCountdownBase(null);
      return;
    }

    if (typeof queueData?.client_called_remaining_seconds === "number") {
      setCalledCountdownBase({
        remainingSeconds: queueData.client_called_remaining_seconds,
        startedAtTs: Date.now(),
      });
    }
  }, [isCalled, queueData?.client_called_remaining_seconds, ticket?.id]);

  const calledTimeoutSeconds =
    queueData?.called_ticket_timeout_seconds ?? CLIENT_CALLED_TIMEOUT_SECONDS;

  const calledRemainingSeconds = useMemo(() => {
    if (!isCalled || !ticket) {
      return null;
    }

    if (calledCountdownBase) {
      const elapsedSeconds = Math.floor(
        (currentTs - calledCountdownBase.startedAtTs) / 1000,
      );
      return Math.max(calledCountdownBase.remainingSeconds - elapsedSeconds, 0);
    }

    const calledAtMs = new Date(ticket.updated_at).getTime();
    const elapsedSeconds = Math.floor((currentTs - calledAtMs) / 1000);
    return Math.max(calledTimeoutSeconds - elapsedSeconds, 0);
  }, [calledCountdownBase, calledTimeoutSeconds, currentTs, isCalled, ticket]);

  let circleTitle = "";

  if (isCalled) {
    circleTitle = t("client.homePage.yourTicket");
  } else if (waitingCount > 0) {
    circleTitle = t("client.homePage.waitingAhead", {
      count: waitingCount,
    });
  } else if (waitingCount === 0) {
    circleTitle = t("client.homePage.youAreNext");
  }

  const safeCalledTimeoutSeconds = Math.max(calledTimeoutSeconds, 1);

  const percent = isCalled
    ? Math.max(
        (Number(calledRemainingSeconds ?? 0) * 100) / safeCalledTimeoutSeconds,
        0,
      )
    : waitingCount > 0
      ? ((initialTicketNumber - waitingCount) * 100) / initialTicketNumber
      : 100;

  return (
    <Flex gap={16} orientation="vertical">
      <div className={styles.top}>
        <Typography.Text></Typography.Text>
        <Circle
          color={isCalled ? "success" : "default"}
          progressProps={{
            percent,
          }}
          contentClassName={styles.circleContent}
        >
          <Typography.Title className={styles.title} level={3}>
            {circleTitle}
          </Typography.Title>

          <Label variant={isCalled ? "success" : "default"}>
            {ticket?.display_number}
          </Label>
          {isCalled && calledRemainingSeconds !== null ? (
            <Typography.Text className={styles.calledTimer}>
              {t("client.homePage.timeLeft", {
                time: formatDuration(calledRemainingSeconds),
              })}
            </Typography.Text>
          ) : null}
        </Circle>
      </div>
      <div className={styles.bottom}>
        <Button
          type="primary"
          onClick={handleSkipOneAhead}
          loading={isAppendPending}
          disabled={isSkipOneAheadDisabled}
        >
          {t("client.homePage.skipOneAhead")}
        </Button>
        <Button
          type="default"
          danger
          onClick={handleLeaveQueue}
          loading={isLeavePending}
        >
          {t("client.homePage.leaveQueue")}
        </Button>
      </div>
    </Flex>
  );
};
