import type { QueueBoardTicketResponse } from "@shared/entities/queue/types";

type TranslateFn = (key: string, options?: Record<string, number>) => string;

export const formatDuration = (seconds: number): string => {
  const safeValue = Math.max(seconds, 0);
  const minutes = Math.floor(safeValue / 60);
  const restSeconds = safeValue % 60;
  return `${String(minutes).padStart(2, "0")}:${String(restSeconds).padStart(2, "0")}`;
};

export const formatApproxWait = (
  seconds: number,
  t: TranslateFn,
): string => {
  if (seconds < 60) {
    return t("client.homePage.lessThanMinute");
  }

  const minutes = Math.ceil(seconds / 60);
  return t("client.homePage.minutes", { count: minutes });
};

export const getWaitingState = (
  waitingTickets: QueueBoardTicketResponse[],
  ticketId?: number,
) => {
  let currentIndex: number | null = null;
  let count = 0;

  waitingTickets.forEach((waitingTicket, index) => {
    if (waitingTicket.id === ticketId) {
      currentIndex = index;
      return;
    }

    if (currentIndex === null || index < currentIndex) {
      count += 1;
    }
  });

  return { currentIndex, count };
};
