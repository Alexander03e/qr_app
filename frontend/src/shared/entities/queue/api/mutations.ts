import { mutationOptions, type UseMutationOptions } from "@tanstack/react-query";
import { queuesApi } from ".";
import type {
  AppendToQueueResponse,
  JoinQueueRequest,
  TicketItemResponse,
  TicketStatus,
  TicketStatusUpdateResponse,
} from "../types";

export const queueMutationKeys = {
  joinQueue: ["queue", "join"],
  updateTicketStatus: ["queue", "ticket", "status"],
  appendToQueue: ["queue", "ticket", "append"],
};

interface UpdateTicketStatusVariables {
  ticketId: number;
  status: TicketStatus;
}

export const queueMutationOptions = {
  joinQueue: (
    options?: Partial<UseMutationOptions<TicketItemResponse, Error, JoinQueueRequest>>,
  ) =>
    mutationOptions({
      mutationKey: queueMutationKeys.joinQueue,
      mutationFn: async (payload: JoinQueueRequest) => queuesApi.joinQueue(payload),
      ...options,
    }),

  updateTicketStatus: (
    options?: Partial<UseMutationOptions<TicketStatusUpdateResponse, Error, UpdateTicketStatusVariables>>,
  ) =>
    mutationOptions({
      mutationKey: queueMutationKeys.updateTicketStatus,
      mutationFn: async ({ ticketId, status }: UpdateTicketStatusVariables) =>
        queuesApi.updateTicketStatus(ticketId, status),
      ...options,
    }),

  appendToQueue: (
    options?: Partial<UseMutationOptions<AppendToQueueResponse, Error, number>>,
  ) =>
    mutationOptions({
      mutationKey: queueMutationKeys.appendToQueue,
      mutationFn: async (ticketId: number) => queuesApi.appendToQueue(ticketId),
      ...options,
    }),
};
