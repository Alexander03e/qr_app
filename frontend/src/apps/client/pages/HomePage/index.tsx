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

const INITIAL_TICKET_NUMBER = 8; // mocks

export const HomePage = () => {
  const { queueData, setQueue, setTicket, ticket, queueId } = useQueueStore();

  const { t } = useTranslation();

  const navigate = useNavigate();
  const { mutateAsync: appendToQueue, isPending: isAppendPending } =
    useMutation(
      queueMutationOptions.appendToQueue({
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

  let circleTitle = "";

  if (waitingCount > 0) {
    circleTitle = t("client.homePage.waitingAhead", {
      count: waitingCount,
    });
  } else if (isCalled) {
    circleTitle = t("client.homePage.yourTicket");
  } else if (waitingCount === 0) {
    circleTitle = t("client.homePage.youAreNext");
  }

  const percent = isCalled
    ? 100
    : waitingCount > 0
      ? ((INITIAL_TICKET_NUMBER - waitingCount) * 100) / INITIAL_TICKET_NUMBER
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
        </Circle>
      </div>
      <div className={styles.bottom}>
        <Button
          type="primary"
          onClick={handleSkipOneAhead}
          loading={isAppendPending}
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
