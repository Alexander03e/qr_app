import { notificationsApi } from "@shared/entities/notification/api";
import type { BrowserPushSubscriptionPayload } from "@shared/entities/notification/types";
import { normalizeError } from "@shared/helper/normalizeError";
import { useCallback, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  disableLocalBrowserNotifications,
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

interface VkIdRenderedWidget {
  on: (event: unknown, handler: (payload: unknown) => void) => VkIdRenderedWidget;
}

interface VkIdSdk {
  Config: {
    init: (config: {
      app: number;
      redirectUrl: string;
      responseMode: unknown;
      source: unknown;
      scope: string;
    }) => void;
  };
  ConfigResponseMode: {
    Callback: unknown;
  };
  ConfigSource: {
    LOWCODE: unknown;
  };
  OneTap: new () => {
    render: (params: {
      container: HTMLElement;
      showAlternativeLogin: boolean;
    }) => VkIdRenderedWidget;
  };
  OneTapInternalEvents: {
    LOGIN_SUCCESS: unknown;
  };
  WidgetEvents: {
    ERROR: unknown;
  };
  Auth: {
    exchangeCode: (
      code: string,
      deviceId: string,
      codeVerifier?: string,
    ) => Promise<unknown>;
    login: (params?: unknown) => Promise<unknown>;
    userInfo: (accessToken: string) => Promise<unknown>;
  };
}

declare global {
  interface Window {
    VKIDSDK?: VkIdSdk;
  }
}

const VK_ID_SDK_URL = "https://unpkg.com/@vkid/sdk@<3.0.0/dist-sdk/umd/index.js";
let vkIdSdkPromise: Promise<VkIdSdk> | null = null;

const getRecordValue = (value: unknown, key: string): unknown => {
  if (!value || typeof value !== "object") {
    return undefined;
  }

  return (value as Record<string, unknown>)[key];
};

const getNestedValue = (value: unknown, path: string[]): unknown =>
  path.reduce<unknown>(
    (currentValue, key) => getRecordValue(currentValue, key),
    value,
  );

const readStringOrNumber = (value: unknown): string | null => {
  if (typeof value === "string" && value.trim()) {
    return value.trim();
  }

  if (typeof value === "number" && Number.isFinite(value)) {
    return String(value);
  }

  return null;
};

const findFirstStringOrNumber = (
  value: unknown,
  paths: string[][],
): string | null => {
  for (const path of paths) {
    const result = readStringOrNumber(getNestedValue(value, path));
    if (result) {
      return result;
    }
  }

  return null;
};

const extractVkUserId = (
  userInfo: unknown,
  tokenPayload: unknown,
): string | null =>
  findFirstStringOrNumber(userInfo, [
    ["user", "user_id"],
    ["user", "id"],
    ["user_id"],
    ["id"],
    ["sub"],
    ["profile", "id"],
  ]) ??
  findFirstStringOrNumber(tokenPayload, [
    ["user_id"],
    ["id"],
    ["user", "user_id"],
    ["user", "id"],
  ]);

const extractAccessToken = (tokenPayload: unknown): string | null =>
  findFirstStringOrNumber(tokenPayload, [["access_token"], ["accessToken"]]);

const loadVkIdSdk = async (): Promise<VkIdSdk> => {
  if (window.VKIDSDK) {
    return window.VKIDSDK;
  }

  if (vkIdSdkPromise) {
    return vkIdSdkPromise;
  }

  vkIdSdkPromise = new Promise<VkIdSdk>((resolve, reject) => {
    const script = document.createElement("script");
    script.src = VK_ID_SDK_URL;
    script.async = true;
    script.onload = () => {
      if (window.VKIDSDK) {
        resolve(window.VKIDSDK);
        return;
      }

      reject(new Error("VK ID SDK is unavailable"));
    };
    script.onerror = () => reject(new Error("VK ID SDK failed to load"));
    document.head.appendChild(script);
  });

  return vkIdSdkPromise;
};

interface VkIdConnectionParams {
  oauthStart: {
    auth_url: string | null;
    bot_url: string | null;
    configured: boolean;
  };
  VKID: VkIdSdk;
  payload: unknown;
}

interface VkIdWidgetMountOptions {
  onReady?: () => void;
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

const isLocalhost = () =>
  window.location.hostname === "localhost" ||
  window.location.hostname === "127.0.0.1";

const isSecurePushContext = () => window.isSecureContext || isLocalhost();

const isIosDevice = () =>
  /iPad|iPhone|iPod/.test(navigator.userAgent) ||
  (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);

const isStandaloneApp = () =>
  window.matchMedia("(display-mode: standalone)").matches ||
  Boolean((navigator as Navigator & { standalone?: boolean }).standalone);

const requestNotificationPermission = async (): Promise<NotificationPermission> => {
  if (Notification.permission !== "default") {
    return Notification.permission;
  }

  return Notification.requestPermission();
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
      isSecurePushContext() &&
      "serviceWorker" in navigator &&
      "PushManager" in window &&
      isBrowserNotificationsSupported(),
    [],
  );
  const pushSupportMessage = useMemo(() => {
    if (!isPushSupported) {
      return t("client.notifications.pushUnsupported");
    }

    if (!isSecurePushContext()) {
      return t("client.notifications.secureContextRequired");
    }

    if (isIosDevice() && !isStandaloneApp()) {
      return t("client.notifications.iosPwaRequired");
    }

    if (!isWebPushSupported) {
      return t("client.notifications.pushUnsupported");
    }

    return null;
  }, [isPushSupported, isWebPushSupported, t]);

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

    if (pushSupportMessage) {
      setFeedback({
        type: "error",
        message: pushSupportMessage,
      });
      return;
    }

    setIsPushLoading(true);
    setFeedback(null);
    try {
      const permission = await requestNotificationPermission();
      if (permission !== "granted") {
        throw new Error(t("client.notifications.pushDenied"));
      }

      const publicKey = await notificationsApi.getWebPushPublicKey();
      if (publicKey.configured && publicKey.public_key && isWebPushSupported) {
        await navigator.serviceWorker.register("/service-worker.js");
        const registration = await navigator.serviceWorker.ready;
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
  }, [clientId, isPushLoading, isWebPushSupported, pushSupportMessage, queueId, t, ticketId]);

  const disableWebPush = useCallback(async () => {
    if (!queueId || !ticketId || isPushLoading) {
      return;
    }

    setIsPushLoading(true);
    setFeedback(null);
    try {
      let endpoint: string | null = null;
      if ("serviceWorker" in navigator && "PushManager" in window) {
        const registration = await navigator.serviceWorker.getRegistration();
        const pushSubscription =
          await registration?.pushManager.getSubscription();
        if (pushSubscription) {
          endpoint = pushSubscription.endpoint;
          await pushSubscription.unsubscribe();
        }
      }

      disableLocalBrowserNotifications(queueId, ticketId);
      await notificationsApi.unsubscribeWebPush({
        queue_id: queueId,
        client_id: clientId,
        ticket_id: ticketId,
        endpoint,
      });

      setIsPushEnabled(false);
      setFeedback({
        type: "success",
        message: t("client.notifications.pushDisabled"),
      });
    } catch (error) {
      setFeedback({
        type: "error",
        message:
          error instanceof Error
            ? error.message
            : normalizeError(error, {
                defaultMessage: t("client.notifications.pushDisableFailed"),
              }),
      });
    } finally {
      setIsPushLoading(false);
    }
  }, [clientId, isPushLoading, queueId, t, ticketId]);

  const prepareVkIdSdk = useCallback(async () => {
    const oauthStart = await notificationsApi.startVkOAuth({
      queue_id: queueId as number,
      client_id: clientId,
      ticket_id: ticketId,
    });
    if (!oauthStart.configured || !oauthStart.auth_url) {
      throw new Error(t("client.notifications.vkOAuthNotConfigured"));
    }

    const authUrl = new URL(oauthStart.auth_url);
    const appId = Number(authUrl.searchParams.get("client_id"));
    const redirectUrl = authUrl.searchParams.get("redirect_uri");
    if (!Number.isFinite(appId) || !redirectUrl) {
      throw new Error(t("client.notifications.vkFailed"));
    }

    const VKID = await loadVkIdSdk();
    VKID.Config.init({
      app: appId,
      redirectUrl,
      responseMode: VKID.ConfigResponseMode.Callback,
      source: VKID.ConfigSource.LOWCODE,
      scope: "",
    });

    return { oauthStart, VKID };
  }, [clientId, queueId, t, ticketId]);

  const completeVkIdConnection = useCallback(
    async ({ oauthStart, payload, VKID }: VkIdConnectionParams) => {
      const code = readStringOrNumber(getRecordValue(payload, "code"));
      const deviceId = readStringOrNumber(getRecordValue(payload, "device_id"));
      if (!code || !deviceId) {
        throw new Error(t("client.notifications.vkFailed"));
      }

      const tokenPayload = await VKID.Auth.exchangeCode(code, deviceId);
      const accessToken = extractAccessToken(tokenPayload);
      const userInfo = accessToken ? await VKID.Auth.userInfo(accessToken) : null;
      const vkUserId = extractVkUserId(userInfo, tokenPayload);
      if (!vkUserId) {
        throw new Error(t("client.notifications.vkIdUserUnavailable"));
      }

      await notificationsApi.subscribeVk({
        queue_id: queueId as number,
        client_id: clientId,
        ticket_id: ticketId,
        vk_id: vkUserId,
      });

      setIsVkEnabled(true);
      setFeedback({
        type: "success",
        message: t("client.notifications.vkEnabled"),
      });

      if (oauthStart.bot_url) {
        window.open(oauthStart.bot_url, "_blank", "noopener,noreferrer");
      }
    },
    [clientId, queueId, t, ticketId],
  );

  const connectVk = useCallback(async () => {
    if (!queueId || !ticketId || isVkLoading) {
      return;
    }

    setIsVkLoading(true);
    setFeedback(null);
    try {
      const { oauthStart, VKID } = await prepareVkIdSdk();
      const payload = await VKID.Auth.login();
      await completeVkIdConnection({ oauthStart, payload, VKID });
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
  }, [
    completeVkIdConnection,
    isVkLoading,
    prepareVkIdSdk,
    queueId,
    t,
    ticketId,
  ]);

  const mountVkIdButton = useCallback(
    (container: HTMLElement, options: VkIdWidgetMountOptions = {}) => {
      let isCancelled = false;
      let isLoginRunning = false;

      const handleConnectionError = (error: unknown) => {
        if (isCancelled) {
          return;
        }

        setFeedback({
          type: "error",
          message:
            error instanceof Error
              ? error.message
              : normalizeError(error, {
                  defaultMessage: t("client.notifications.vkFailed"),
                }),
        });
      };

      const mount = async () => {
        if (!queueId || !ticketId) {
          return;
        }

        setIsVkLoading(true);
        try {
          const { oauthStart, VKID } = await prepareVkIdSdk();
          if (isCancelled) {
            return;
          }

          container.replaceChildren();
          const oneTap = new VKID.OneTap();
          oneTap
            .render({
              container,
              showAlternativeLogin: true,
            })
            .on(VKID.WidgetEvents.ERROR, handleConnectionError)
            .on(VKID.OneTapInternalEvents.LOGIN_SUCCESS, async (payload) => {
              if (isLoginRunning || isCancelled) {
                return;
              }

              isLoginRunning = true;
              setIsVkLoading(true);
              setFeedback(null);
              try {
                await completeVkIdConnection({ oauthStart, payload, VKID });
              } catch (error) {
                handleConnectionError(error);
              } finally {
                isLoginRunning = false;
                if (!isCancelled) {
                  setIsVkLoading(false);
                }
              }
            });

          window.setTimeout(() => {
            if (!isCancelled && container.childElementCount > 0) {
              options.onReady?.();
            }
          }, 500);
        } catch (error) {
          handleConnectionError(error);
        } finally {
          if (!isCancelled) {
            setIsVkLoading(false);
          }
        }
      };

      void mount();

      return () => {
        isCancelled = true;
        container.replaceChildren();
      };
    },
    [completeVkIdConnection, prepareVkIdSdk, queueId, t, ticketId],
  );

  return {
    connectVk,
    disableWebPush,
    enableWebPush,
    feedback,
    isPushEnabled,
    isPushLoading,
    isPushSupported,
    pushSupportMessage,
    isStatusLoading,
    isVkEnabled,
    isVkLoading,
    loadStatus,
    mountVkIdButton,
  };
};
