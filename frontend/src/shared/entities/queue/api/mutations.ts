import { mutationOptions } from "@tanstack/react-query";
import { queuesApi } from ".";
import type {
  AppendToQueueResponse,
  InviteNextResponse,
  JoinQueueRequest,
  TicketItemResponse,
  TicketStatusUpdateResponse,
} from "../types";
import { queryClient, type MutationOptionsType } from "@shared/api";
import { queueQueryKeys } from "./queries";
import type { TicketStatus } from "../types/enum";

export const queueMutationKeys = {
  joinQueue: ["queue", "join"],
  updateTicketStatus: ["queue", "ticket", "status"],
  appendToQueue: ["queue", "ticket", "append"],
  inviteNext: ["queue", "invite", "next"],
};

interface UpdateTicketStatusVariables {
  ticketId: number;
  status: TicketStatus;
}

export const queueMutationOptions = {
  joinQueue: (
    options?: MutationOptionsType<TicketItemResponse, JoinQueueRequest>,
  ) =>
    mutationOptions({
      mutationKey: queueMutationKeys.joinQueue,
      mutationFn: async (payload: JoinQueueRequest) => queuesApi.joinQueue(payload),
      ...options,
    }),

  updateTicketStatus: (
    options?: MutationOptionsType<TicketStatusUpdateResponse, UpdateTicketStatusVariables>,
  ) =>
    mutationOptions({
      mutationKey: queueMutationKeys.updateTicketStatus,
      mutationFn: async ({ ticketId, status }: UpdateTicketStatusVariables) =>
        queuesApi.updateTicketStatus(ticketId, status),
      ...options,
    }),

  appendToQueue: (
    options?: MutationOptionsType<AppendToQueueResponse, number>,
  ) =>
    mutationOptions({
      mutationKey: queueMutationKeys.appendToQueue,
      mutationFn: async (ticketId: number) => queuesApi.appendToQueue(ticketId),
      ...options,
    }),

  inviteNext: (
    options?: MutationOptionsType<InviteNextResponse, number>,
  ) => {
    const {onSuccess, ...rest} = options || {}

    return mutationOptions({
      mutationKey: queueMutationKeys.inviteNext,
      mutationFn: async (queueId: number) => queuesApi.inviteNext(queueId),
      onSuccess: (data, variables, a, b) => {
          onSuccess?.(data, variables, a, b);
          // Используем refetchQueries вместо invalidateQueries для надёжности
          queryClient.refetchQueries({ 
            queryKey: queueQueryKeys.getQueue(variables, null),
          })
      },
      ...rest,
    })
  }
};
