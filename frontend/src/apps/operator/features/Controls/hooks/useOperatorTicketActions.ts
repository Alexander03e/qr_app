import { useOperatorQueue } from "@apps/operator/store";
import { queueMutationOptions } from "@shared/entities/queue/api/mutations";
import type { QueueBoardTicketResponse } from "@shared/entities/queue/types";
import {
  TICKET_STATUS,
  type TicketStatus,
} from "@shared/entities/queue/types/enum";
import { makeRequest } from "@shared/helper/handler";
import { useMutation } from "@tanstack/react-query";
import { useState } from "react";

export type OperatorTicketAction =
  | "next"
  | "start"
  | "complete"
  | "notArrived"
  | "return"
  | "remove";

const isCalledTicket = (ticket: QueueBoardTicketResponse | null) =>
  ticket?.status === TICKET_STATUS.CALLED;

const isInServiceTicket = (ticket: QueueBoardTicketResponse | null) =>
  ticket?.status === TICKET_STATUS.IN_SERVICE;

export const useOperatorTicketActions = () => {
  const { queueData, queueId, setQueue } = useOperatorQueue();
  const [pendingAction, setPendingAction] =
    useState<OperatorTicketAction | null>(null);

  const currentTicket = queueData?.current_ticket ?? null;

  const { mutateAsync: inviteNextTicket } = useMutation(
    queueMutationOptions.inviteNext({
      onSuccess: (data) => setQueue(data.queue_snapshot),
    }),
  );

  const { mutateAsync: updateStatus } = useMutation(
    queueMutationOptions.updateTicketStatus({
      onSuccess: (data) => setQueue(data.queue_snapshot),
    }),
  );

  const { mutateAsync: removeTicket } = useMutation(
    queueMutationOptions.removeTicket({
      onSuccess: (data) => setQueue(data.queue_snapshot),
    }),
  );

  const runAction = async (
    action: OperatorTicketAction,
    request: () => Promise<unknown>,
  ) => {
    if (pendingAction) {
      return;
    }

    setPendingAction(action);
    try {
      await makeRequest(request());
    } catch {
      return;
    } finally {
      setPendingAction(null);
    }
  };

  const updateCurrentTicketStatus = (
    action: OperatorTicketAction,
    status: TicketStatus,
  ) => {
    if (!currentTicket) {
      return;
    }

    return runAction(action, () =>
      updateStatus({ ticketId: currentTicket.id, status }),
    );
  };

  return {
    currentTicket,
    waitingCount: queueData?.waiting_count ?? 0,
    pendingAction,
    isBusy: Boolean(pendingAction),
    canInviteNext: Boolean(queueId) && !currentTicket,
    canStartService: isCalledTicket(currentTicket),
    canCompleteService: isInServiceTicket(currentTicket),
    canMarkNotArrived: isCalledTicket(currentTicket),
    canReturnToQueue:
      isCalledTicket(currentTicket) || isInServiceTicket(currentTicket),
    canRemoveCurrent: Boolean(currentTicket),
    inviteNext: () => {
      if (!queueId || currentTicket) {
        return;
      }

      return runAction("next", () => inviteNextTicket(queueId));
    },
    startService: () =>
      updateCurrentTicketStatus("start", TICKET_STATUS.IN_SERVICE),
    completeService: () =>
      updateCurrentTicketStatus("complete", TICKET_STATUS.COMPLETED),
    markNotArrived: () =>
      updateCurrentTicketStatus("notArrived", TICKET_STATUS.NOT_ARRIVED),
    returnToQueue: () =>
      updateCurrentTicketStatus("return", TICKET_STATUS.WAITING),
    removeCurrent: () => {
      if (!currentTicket) {
        return;
      }

      return runAction("remove", () => removeTicket(currentTicket.id));
    },
  };
};
