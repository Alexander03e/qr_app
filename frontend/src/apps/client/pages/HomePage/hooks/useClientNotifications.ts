import { notificationsApi } from "@shared/entities/notification/api";
import type { BrowserPushSubscriptionPayload } from "@shared/entities/notification/types";
import { normalizeError } from "@shared/helper/normalizeError";
import { useCallback, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  enableLocalBrowserNotifications,
  hasLocalBrowserNotifications,
  isBrowserNotificationsSupported,
} from "./useBrowserTicketNotification";

type FeedbackType = "success" | "error" | "info";

interface UseClientNotificationsParams {
  queueId: number | null;
  clientId: string | null;
  ticketId?: number;
}

interface VkOAuthMessage {
  source: "queueflow-vk-oauth";
  status: "success" | "error";
  message?: string;
  bot_url?: string | null;
}

const urlBase64ToArrayBuffer = (base64String: string): ArrayBuffer => {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = `${base64String}${padding}`
    .replace(/-/g, "+")
    .replace(/_/g, "/");
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);

  for (let index = 0; index < rawData.length; index += 1) {
    outputArray[index] = rawData.charCodeAt(index);
  }

  return outputArray.buffer as ArrayBuffer;
};

const serializePushSubscription = (
  subscription: PushSubscription,
): BrowserPushSubscriptionPayload => {
  const payload = subscription.toJSON() as BrowserPushSubscriptionPayload;

  if (!payload.endpoint || !payload.keys?.auth || !payload.keys?.p256dh) {
    throw new Error("Invalid push subscription");
  }

  return payload;
};

export const useClientNotifications = ({
  queueId,
  clientId,
  ticketId,
}: UseClientNotificationsParams) => {
  const { t } = useTranslation();
  const [isPushEnabled, setIsPushEnabled] = useState(false);
  const [isVkEnabled, setIsVkEnabled] = useState(false);
  const [isPushLoading, setIsPushLoading] = useState(false);
  const [isVkLoading, setIsVkLoading] = useState(false);
  const [isStatusLoading, setIsStatusLoading] = useState(false);
  const [feedback, setFeedback] = useState<{
    type: FeedbackType;
    message: string;
  } | null>(null);

  const isPushSupported = useMemo(() => isBrowserNotificationsSupported(), []);
  const isWebPushSupported = useMemo(
    () =>
      typeof window !== "undefined" &&
      "serviceWorker" in navigator &&
      "PushManager" in window &&
      isBrowserNotificationsSupported(),
    [],
  );

  const loadStatus = useCallback(async () => {
    if (!queueId || (!clientId && !ticketId)) {
      return;
    }

    setIsStatusLoading(true);
    try {
      const status = await notificationsApi.getStatus({
        queue_id: queueId,
        client_id: clientId,
        ticket_id: ticketId,
      });
      setIsPushEnabled(
        status.web_push_enabled || hasLocalBrowserNotifications(queueId, ticketId),
      );
      setIsVkEnabled(status.vk_enabled);
    } catch {
      setFeedback({
        type: "info",
        message: t("client.notifications.statusUnavailable"),
      });
    } finally {
      setIsStatusLoading(false);
    }
  }, [clientId, queueId, t, ticketId]);

  const enableWebPush = useCallback(async () => {
    if (!queueId || !ticketId || isPushLoading) {
      return;
    }

    if (!isPushSupported) {
      setFeedback({
        type: "error",
        message: t("client.notifications.pushUnsupported"),
      });
      return;
    }

    setIsPushLoading(true);
    setFeedback(null);
    try {
      const publicKey = await notificationsApi.getWebPushPublicKey();
      const permission = await Notification.requestPermission();
      if (permission !== "granted") {
        throw new Error(t("client.notifications.pushDenied"));
      }

      if (publicKey.configured && publicKey.public_key && isWebPushSupported) {
        const registration =
          await navigator.serviceWorker.register("/service-worker.js");
        const existingSubscription =
          await registration.pushManager.getSubscription();
        const pushSubscription =
          existingSubscription ??
          (await registration.pushManager.subscribe({
            userVisibleOnly: true,
            applicationServerKey: urlBase64ToArrayBuffer(publicKey.public_key),
          }));

        await notificationsApi.subscribeWebPush({
          queue_id: queueId,
          client_id: clientId,
          ticket_id: ticketId,
          subscription: serializePushSubscription(pushSubscription),
        });
      } else {
        enableLocalBrowserNotifications(queueId, ticketId);
      }

      setIsPushEnabled(true);
      setFeedback({
        type: "success",
        message:
          publicKey.configured && publicKey.public_key && isWebPushSupported
            ? t("client.notifications.pushEnabled")
            : t("client.notifications.browserNotificationsEnabled"),
      });
    } catch (error) {
      setFeedback({
        type: "error",
        message:
          error instanceof Error
            ? error.message
            : normalizeError(error, {
                defaultMessage: t("client.notifications.pushFailed"),
              }),
      });
    } finally {
      setIsPushLoading(false);
    }
  }, [clientId, isPushLoading, isPushSupported, isWebPushSupported, queueId, t, ticketId]);

  const connectVk = useCallback(
    async () => {
      if (!queueId || !ticketId || isVkLoading) {
        return;
      }

      setIsVkLoading(true);
      setFeedback(null);
      try {
        const oauthStart = await notificationsApi.startVkOAuth({
          queue_id: queueId,
          client_id: clientId,
          ticket_id: ticketId,
        });
        if (!oauthStart.configured || !oauthStart.auth_url) {
          throw new Error(t("client.notifications.vkOAuthNotConfigured"));
        }

        const popup = window.open(
          oauthStart.auth_url,
          "queueflow-vk-oauth",
          "popup=yes,width=520,height=720",
        );
        if (!popup) {
          throw new Error(t("client.notifications.vkOAuthPopupBlocked"));
        }

        await new Promise<VkOAuthMessage>((resolve, reject) => {
          const timeoutId = window.setTimeout(() => {
            cleanup();
            reject(new Error(t("client.notifications.vkOAuthTimeout")));
          }, 180000);

          const intervalId = window.setInterval(() => {
            if (popup.closed) {
              cleanup();
              reject(new Error(t("client.notifications.vkOAuthClosed")));
            }
          }, 500);

          const handleMessage = (event: MessageEvent) => {
            const data = event.data as Partial<VkOAuthMessage>;
            if (data?.source !== "queueflow-vk-oauth") {
              return;
            }

            cleanup();
            if (data.status === "success") {
              resolve(data as VkOAuthMessage);
              return;
            }

            reject(
              new Error(
                data.message || t("client.notifications.vkFailed"),
              ),
            );
          };

          function cleanup() {
            window.clearTimeout(timeoutId);
            window.clearInterval(intervalId);
            window.removeEventListener("message", handleMessage);
          }

          window.addEventListener("message", handleMessage);
        });

        setIsVkEnabled(true);
        setFeedback({
          type: "success",
          message: t("client.notifications.vkEnabled"),
        });
      } catch (error) {
        setFeedback({
          type: "error",
          message:
            error instanceof Error
              ? error.message
              : normalizeError(error, {
                  defaultMessage: t("client.notifications.vkFailed"),
                }),
        });
      } finally {
        setIsVkLoading(false);
      }
    },
    [clientId, isVkLoading, queueId, t, ticketId],
  );

  return {
    connectVk,
    enableWebPush,
    feedback,
    isPushEnabled,
    isPushLoading,
    isPushSupported,
    isStatusLoading,
    isVkEnabled,
    isVkLoading,
    loadStatus,
  };
};
