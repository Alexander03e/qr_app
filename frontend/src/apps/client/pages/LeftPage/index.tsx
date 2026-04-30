import { useQueueStore } from "@apps/client/store";
import { queueMutationOptions } from "@shared/entities/queue/api/mutations";
import { useMutation } from "@tanstack/react-query";
import { Button, Flex, Typography } from "antd";
import { useTranslation } from "react-i18next";
import { useNavigate, useParams } from "react-router-dom";
import { paths } from "@apps/client/helpers/paths";
import { useMemo } from "react";
import {
  writeQueueSession,
  getOrCreateDeviceId,
  getOrCreateQueueToken,
} from "@apps/client/helpers";
import { makeRequest } from "@shared/helper/handler";
import { FeedbackForm } from "@apps/client/features";
import styles from "./LeftPage.module.scss";

export const LeftPage = () => {
  const { t } = useTranslation();
  const { queueId } = useParams();
  const navigate = useNavigate();
  const {
    clientId,
    setClientId,
    setQueueId,
    setTicket,
    setIsInQueue,
    isServed,
    setIsServed,
  } = useQueueStore();

  const deviceId = useMemo(() => getOrCreateDeviceId(), []);
  const queueToken = useMemo(() => getOrCreateQueueToken(), []);
  const resolvedClientId = clientId || queueToken;

  const { mutateAsync: joinQueue, isPending } = useMutation(
    queueMutationOptions.joinQueue({
      onSuccess: (ticket) => {
        if (!queueId) {
          return;
        }

        const parsedQueueId = Number(queueId);

        setClientId(resolvedClientId);
        setQueueId(parsedQueueId);
        setTicket(ticket);
        setIsInQueue(true);
        setIsServed(false);
        writeQueueSession({
          clientId: resolvedClientId,
          deviceId,
          queueToken,
          queueId: parsedQueueId,
          ticketId: ticket.id,
        });
        navigate(paths.queuePage(queueId));
      },
    }),
  );

  const handleJoinQueue = () => {
    if (!queueId) return null;
    makeRequest(
      joinQueue({
        queue_id: Number(queueId),
        client_id: resolvedClientId,
        queue_token: queueToken,
        client: {
          device_id: deviceId,
          queue_token: queueToken,
        },
      }),
    );
  };

  return (
    <Flex className={styles.wrapper} gap={16} vertical>
      <Typography.Title level={3}>
        {isServed
          ? t("client.leftPage.completedTitle")
          : t("client.leftPage.title")}
      </Typography.Title>
      <Typography>
        {isServed
          ? t("client.leftPage.completedDescription")
          : t("client.leftPage.description")}
      </Typography>
      {queueId ? (
        <FeedbackForm
          queueId={Number(queueId)}
          origin={isServed ? "completed" : "left"}
        />
      ) : null}
      <Button
        type="primary"
        className={styles.returnButton}
        loading={isPending}
        onClick={handleJoinQueue}
      >
        {t("client.leftPage.returnButton")}
      </Button>
    </Flex>
  );
};
