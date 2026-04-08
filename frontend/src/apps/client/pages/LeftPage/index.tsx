import { useQueueStore } from "@apps/client/store";
import { queueMutationOptions } from "@shared/entities/queue/api/mutations";
import { useMutation } from "@tanstack/react-query";
import { Button, Flex, Typography } from "antd";
import { useTranslation } from "react-i18next";
import { useNavigate, useParams } from "react-router-dom";
import { paths } from "@apps/client/helpers/paths";
import { useMemo } from "react";
import { writeQueueSession, getOrCreateDeviceId } from "@apps/client/helpers";
import { makeRequest } from "../../../../shared/helper/handler";

export const LeftPage = () => {
  const { t } = useTranslation();
  const { queueId } = useParams();
  const navigate = useNavigate();
  const { clientId, setClientId, setQueueId, setTicket, setIsInQueue } =
    useQueueStore();

  const deviceId = useMemo(() => getOrCreateDeviceId(), []);
  const resolvedClientId = clientId || deviceId;

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
        writeQueueSession({
          clientId: resolvedClientId,
          deviceId,
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
      }),
    );
  };

  return (
    <Flex gap={12} vertical>
      <Typography.Title level={3}>
        {t("client.leftPage.title")}
      </Typography.Title>
      <Typography>{t("client.leftPage.description")}</Typography>
      <Button
        type="primary"
        style={{ width: "fit-content" }}
        loading={isPending}
        onClick={handleJoinQueue}
      >
        {t("client.leftPage.returnButton")}
      </Button>
    </Flex>
  );
};
