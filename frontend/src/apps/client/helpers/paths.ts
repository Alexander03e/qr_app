export const paths = {
  queuePage: (queueId: number | string) => `/c/${queueId}`,
  leftPage: (queueId: number | string) => `/c/${queueId}/left`,
  missedPage: (queueId: number | string) => `/c/${queueId}/missed`,
};
