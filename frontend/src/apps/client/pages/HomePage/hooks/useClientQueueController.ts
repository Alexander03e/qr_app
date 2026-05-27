import { clearQueueSession, paths } from "@apps/client/helpers";
import { useQueueStore } from "@apps/client/store";
import { CLIENT_CALLED_TIMEOUT_SECONDS } from "@shared/consts";
import { queueMutationOptions } from "@shared/entities/queue/api/mutations";
import { TICKET_STATUS } from "@shared/entities/queue/types/enum";
import { makeRequest } from "@shared/helper/handler";
import { useMutation } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { formatApproxWait, formatDuration, getWaitingState } from "../helpers";

export const useClientQueueController = () => {
  const { clientId, queueData, setQueue, setTicket, ticket, queueId } = useQueueStore();
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [currentTs, setCurrentTs] = useState<number>(() => Date.now());
  const [calledCountdownBase, setCalledCountdownBase] = useState<{
    remainingSeconds: number;
    startedAtTs: number;
  } | null>(null);

  const { mutateAsync: skipOneAhead, isPending: isSkipPending } = useMutation(
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
        clearQueueSession();
      },
    }),
  );

  const waitingState = useMemo(
    () => getWaitingState(queueData?.waiting_tickets ?? [], ticket?.id),
    [queueData?.waiting_tickets, ticket?.id],
  );
  const waitingCount = waitingState.count;
  const waitingTicketsCount = queueData?.waiting_tickets?.length ?? 0;
  const isCalled = ticket?.status === TICKET_STATUS.CALLED;
  const isInService = ticket?.status === TICKET_STATUS.IN_SERVICE;
  const isWaiting = ticket?.status === TICKET_STATUS.WAITING;
  const isSkipOneAheadDisabled =
    !ticket ||
    isSkipPending ||
    isInService ||
    (isWaiting &&
      (waitingState.currentIndex === null ||
        waitingState.currentIndex >= waitingTicketsCount - 1)) ||
    (isCalled && waitingTicketsCount === 0);
  const isLeaveDisabled = !ticket || isLeavePending || isInService;

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

  const initialTicketNumber =
    ticket?.initial_ticket_number ?? Math.max(waitingCount + 1, 1);
  const safeCalledTimeoutSeconds = Math.max(calledTimeoutSeconds, 1);
  const percent = isCalled
    ? Math.max(
        (Number(calledRemainingSeconds ?? 0) * 100) / safeCalledTimeoutSeconds,
        0,
      )
    : isInService
      ? 100
      : waitingCount > 0
      ? ((initialTicketNumber - waitingCount) * 100) / initialTicketNumber
      : 100;

  const circleTitle = isCalled
    ? t("client.homePage.yourTicket")
    : isInService
      ? t("client.homePage.inService")
      : waitingCount > 0
      ? t("client.homePage.waitingAhead", { count: waitingCount })
      : t("client.homePage.youAreNext");
  const calledTimeLeftLabel =
    isCalled && calledRemainingSeconds !== null
      ? t("client.homePage.timeLeft", {
          time: formatDuration(calledRemainingSeconds),
        })
      : null;
  const estimatedWaitLabel =
    !isCalled && !isInService && typeof queueData?.estimated_wait_seconds === "number"
      ? t("client.homePage.estimatedWait", {
          time: formatApproxWait(queueData.estimated_wait_seconds, t),
        })
      : null;

  const handleSkipOneAhead = () => {
    if (!ticket || isSkipPending) {
      return;
    }

    makeRequest(skipOneAhead(ticket.id));
  };

  const handleLeaveQueue = async () => {
    if (!ticket || isLeaveDisabled) {
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

  return {
    calledTimeLeftLabel,
    clientId,
    circleTitle,
    currentTicketNumber: queueData?.current_ticket?.display_number ?? null,
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
    queueName: queueData?.queue_name ?? null,
    ticket,
    waitingTicketsCount,
  };
};
