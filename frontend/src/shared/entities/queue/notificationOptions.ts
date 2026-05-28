export const QUEUE_NOTIFICATION_CHANNEL_OPTIONS = [
  { label: "VK", value: "vk" },
  { label: "Web Push", value: "webpush" },
] as const;

export type QueueNotificationChannel =
  (typeof QUEUE_NOTIFICATION_CHANNEL_OPTIONS)[number]["value"];

export interface QueueNotificationOptions {
  channels: QueueNotificationChannel[];
}

const supportedChannels = new Set<QueueNotificationChannel>(
  QUEUE_NOTIFICATION_CHANNEL_OPTIONS.map((item) => item.value),
);

export const normalizeQueueNotificationChannels = (
  options: unknown,
): QueueNotificationChannel[] => {
  if (!options || typeof options !== "object" || !("channels" in options)) {
    return [];
  }

  const channels = (options as { channels?: unknown }).channels;
  if (!Array.isArray(channels)) {
    return [];
  }

  return channels.filter(
    (channel): channel is QueueNotificationChannel =>
      typeof channel === "string" &&
      supportedChannels.has(channel as QueueNotificationChannel),
  );
};

export const makeQueueNotificationOptions = (
  options: unknown,
): QueueNotificationOptions => ({
  channels: normalizeQueueNotificationChannels(options),
});
