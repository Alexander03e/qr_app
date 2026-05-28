import type { TicketItemResponse } from "@shared/entities/queue/types";
import { TICKET_STATUS } from "@shared/entities/queue/types/enum";
import { useEffect, useRef } from "react";
import { useTranslation } from "react-i18next";

export const isBrowserNotificationsSupported = () =>
  typeof window !== "undefined" && "Notification" in window;

const getBrowserNotificationKey = (queueId: number, ticketId: number) =>
  `queueflow:browser-notifications:${queueId}:${ticketId}`;

export const enableLocalBrowserNotifications = (
  queueId: number,
  ticketId: number,
) => {
  try {
    window.localStorage.setItem(getBrowserNotificationKey(queueId, ticketId), "1");
  } catch {
    return;
  }
};

export const disableLocalBrowserNotifications = (
  queueId: number,
  ticketId: number,
) => {
  try {
    window.localStorage.removeItem(getBrowserNotificationKey(queueId, ticketId));
  } catch {
    return;
  }
};

export const hasLocalBrowserNotifications = (
  queueId: number,
  ticketId?: number | null,
) => {
  if (!ticketId || typeof window === "undefined") {
    return false;
  }

  try {
    return window.localStorage.getItem(getBrowserNotificationKey(queueId, ticketId)) === "1";
  } catch {
    return false;
  }
};

interface UseBrowserTicketNotificationParams {
  enabled?: boolean;
  queueId: number | null;
  queueName: string | null;
  ticket: TicketItemResponse | null;
}

export const useBrowserTicketNotification = ({
  enabled = true,
  queueId,
  queueName,
  ticket,
}: UseBrowserTicketNotificationParams) => {
  const { t } = useTranslation();
  const shownNotificationRef = useRef<string | null>(null);

  useEffect(() => {
    if (
      !enabled ||
      !queueId ||
      !ticket ||
      ticket.status !== TICKET_STATUS.CALLED ||
      !hasLocalBrowserNotifications(queueId, ticket.id) ||
      !isBrowserNotificationsSupported() ||
      Notification.permission !== "granted"
    ) {
      return;
    }

    const notificationKey = `${ticket.id}:${ticket.status}:${ticket.updated_at}`;
    if (shownNotificationRef.current === notificationKey) {
      return;
    }
    shownNotificationRef.current = notificationKey;

    const notification = new Notification(
      t("client.notifications.localTicketCalledTitle"),
      {
        body: t("client.notifications.localTicketCalledBody", {
          ticket: ticket.display_number,
          queue: queueName ?? ticket.queue_name,
        }),
        tag: `queueflow-ticket-${ticket.id}`,
      },
    );

    notification.onclick = () => {
      window.focus();
      notification.close();
    };
  }, [enabled, queueId, queueName, t, ticket]);
};
