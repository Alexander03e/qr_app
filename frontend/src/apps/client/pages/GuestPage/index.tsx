import { Circle } from "@apps/client/components";
import styles from "./GuestPage.module.scss";
import { Typography } from "antd";
import { useTranslation } from "react-i18next";
import { useQueueStore, writeQueueSession } from "@apps/client/store";
import { useMutation } from "@tanstack/react-query";
import { queueMutationOptions } from "@shared/entities/queue/api/mutations";
import { useParams } from "react-router-dom";

export const GuestPage = () => {
  const { t } = useTranslation();
  const { queueData, setTicket, setIsInQueue, setQueueId } = useQueueStore();
  const { queueId } = useParams();

  const queueCount = queueData?.waiting_count;

  const {
    mutate: joinQueue,
    isPending,
    isError,
  } = useMutation(
    queueMutationOptions.joinQueue({
      onSuccess: (ticket) => {
        if (!queueId) {
          return;
        }

        const parsedQueueId = Number(queueId);
        setQueueId(parsedQueueId);
        setTicket(ticket);
        setIsInQueue(true);
        writeQueueSession({
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

    joinQueue({
      queue_id: Number(queueId),
    });
  };

  return (
    <div className={styles.wrapper}>
      <div className={styles.bottom}>
        <Circle
          variant="filled"
          title={
            isPending
              ? t("client.guestPage.loading")
              : t("client.guestPage.enterQueue")
          }
          onClick={handleEnterQueue}
        />
        <Typography.Title level={4}>
          {t("client.guestPage.queueCaption", { count: queueCount })}
        </Typography.Title>
        {isError ? (
          <Typography.Text type="danger">
            {t("client.guestPage.errorJoinQueue")}
          </Typography.Text>
        ) : null}
      </div>
    </div>
  );
};
