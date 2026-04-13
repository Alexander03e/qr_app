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

export const MissedPage = () => {
  const { t } = useTranslation();
  const { queueId } = useParams();
  const navigate = useNavigate();
  const {
    clientId,
    setClientId,
    setQueueId,
    setTicket,
    setIsInQueue,
    setIsNotArrived,
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
        setIsNotArrived(false);
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
    if (!queueId) {
      return;
    }

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
    <Flex gap={12} vertical>
      <Typography.Title level={3}>
        {t("client.missedPage.title")}
      </Typography.Title>
      <Typography>{t("client.missedPage.description")}</Typography>
      <Button
        type="primary"
        style={{ width: "fit-content" }}
        loading={isPending}
        onClick={handleJoinQueue}
      >
        {t("client.missedPage.returnButton")}
      </Button>
    </Flex>
  );
};
