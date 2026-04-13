import styles from "./GuestPage.module.scss";
import { Button, Typography } from "antd";
import { useTranslation } from "react-i18next";
import { useQueueStore } from "@apps/client/store";
import { useMutation } from "@tanstack/react-query";
import { queueMutationOptions } from "@shared/entities/queue/api/mutations";
import { useParams } from "react-router-dom";
import {
  writeQueueSession,
  getOrCreateDeviceId,
  getOrCreateQueueToken,
  readClientLanguage,
} from "@apps/client/helpers";
import { makeRequest } from "@shared/helper/handler";

export const GuestPage = () => {
  const { t } = useTranslation();
  const {
    clientId,
    queueData,
    setTicket,
    setClientId,
    setIsInQueue,
    setQueueId,
  } = useQueueStore();
  const { queueId } = useParams();

  const queueCount = queueData?.waiting_count;

  const { mutateAsync: joinQueue, isPending } = useMutation(
    queueMutationOptions.joinQueue({
      onSuccess: (ticket) => {
        if (!queueId) {
          return;
        }

        const parsedQueueId = Number(queueId);
        const deviceId = getOrCreateDeviceId();
        const queueToken = getOrCreateQueueToken();
        const resolvedClientId = clientId ?? queueToken;

        setClientId(resolvedClientId);
        setQueueId(parsedQueueId);
        setTicket(ticket);
        setIsInQueue(true);
        writeQueueSession({
          clientId: resolvedClientId,
          deviceId,
          queueToken,
          queueId: parsedQueueId,
          ticketId: ticket.id,
        });
      },
    }),
  );

  const handleEnterQueue = () => {
    if (!queueId || isPending) {
      return;
    }

    makeRequest(
      joinQueue({
        queue_id: Number(queueId),
        client_id: clientId ?? getOrCreateQueueToken(),
        queue_token: getOrCreateQueueToken(),
        client: {
          device_id: getOrCreateDeviceId(),
          queue_token: getOrCreateQueueToken(),
          preferred_lang: readClientLanguage() ?? undefined,
        },
      }),
    );
  };

  return (
    <div className={styles.wrapper}>
      <div className={styles.bottom}>
        <Typography.Title className={styles.caption} level={3}>
          {t("client.guestPage.queueCaption", { count: queueCount })}
        </Typography.Title>
        <Button loading={isPending} onClick={handleEnterQueue} type="primary">
          {t("client.guestPage.enterQueue")}
        </Button>
      </div>
    </div>
  );
};
