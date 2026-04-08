export const CLIENT_QUEUE_SESSION_KEY = "client_queue_session";

export interface PersistedQueueSession {
  queueId: number;
  ticketId: number;
}

export const readQueueSession = (): PersistedQueueSession | null => {
  const rawValue = sessionStorage.getItem(CLIENT_QUEUE_SESSION_KEY);

  if (!rawValue) {
    return null;
  }

  try {
    const parsedValue = JSON.parse(rawValue) as PersistedQueueSession;

    if (
      typeof parsedValue?.queueId === "number"
      && typeof parsedValue?.ticketId === "number"
    ) {
      return parsedValue;
    }
  } catch {
    sessionStorage.removeItem(CLIENT_QUEUE_SESSION_KEY);
    return null;
  }

  sessionStorage.removeItem(CLIENT_QUEUE_SESSION_KEY);
  return null;
};

export const writeQueueSession = (payload: PersistedQueueSession): void => {
  sessionStorage.setItem(CLIENT_QUEUE_SESSION_KEY, JSON.stringify(payload));
};

export const clearQueueSession = (): void => {
  sessionStorage.removeItem(CLIENT_QUEUE_SESSION_KEY);
};
