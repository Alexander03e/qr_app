import {
  CLIENT_DEVICE_ID_STORAGE_KEY,
  CLIENT_QUEUE_SESSION_KEY,
} from "@shared/consts";

export interface PersistedQueueSession {
  clientId: string;
  deviceId: string;
  queueId: number;
  ticketId: number;
}

const buildDeviceFingerprint = (): string => {
  const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
  const language = navigator.language;
  const platform = navigator.platform;
  const userAgent = navigator.userAgent;
  const screenData = `${window.screen.width}x${window.screen.height}x${window.screen.colorDepth}`;

  return [timezone, language, platform, userAgent, screenData].join("|");
};

const hashToHex = (value: string): string => {
  let hash = 0;

  for (let index = 0; index < value.length; index += 1) {
    hash = (hash << 5) - hash + value.charCodeAt(index);
    hash |= 0;
  }

  return Math.abs(hash).toString(16);
};

export const getOrCreateDeviceId = (): string => {
  const storedValue = localStorage.getItem(CLIENT_DEVICE_ID_STORAGE_KEY);
  if (storedValue) {
    return storedValue;
  }

  const fingerprint = buildDeviceFingerprint();
  const generatedId = `dev-${hashToHex(fingerprint)}`;
  localStorage.setItem(CLIENT_DEVICE_ID_STORAGE_KEY, generatedId);

  return generatedId;
};

export const readQueueSession = (): PersistedQueueSession | null => {
  const rawValue = sessionStorage.getItem(CLIENT_QUEUE_SESSION_KEY);

  if (!rawValue) {
    return null;
  }

  try {
    const parsedValue = JSON.parse(rawValue) as PersistedQueueSession;

    if (typeof parsedValue?.clientId !== "string") {
      sessionStorage.removeItem(CLIENT_QUEUE_SESSION_KEY);
      return null;
    }

    if (typeof parsedValue?.deviceId !== "string") {
      sessionStorage.removeItem(CLIENT_QUEUE_SESSION_KEY);
      return null;
    }

    if (typeof parsedValue?.queueId === "number" && typeof parsedValue?.ticketId === "number") {
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
