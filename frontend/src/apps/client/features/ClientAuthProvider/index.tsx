import {
  getOrCreateDeviceId,
  paths,
  readQueueSession,
  writeQueueSession,
} from "@apps/client/helpers";
import { useQueueStore } from "@apps/client/store";
import { useAppStore } from "@apps/client/store/appStore";
import { queueQueryOptions } from "@shared/entities/queue/api/queries";
import { normalizeError } from "@shared/helper/normalizeError";
import { useQuery } from "@tanstack/react-query";
import { useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";

const inQueue = (queueId: string | undefined, queueState: boolean): boolean => {
  if (!queueState || queueState || !queueId) {
    return queueState;
  }

  const session = readQueueSession();
  return Boolean(session && String(session.queueId) === String(queueId));
};

export const ClientAuthProvider = ({
  children,
}: {
  children: React.ReactNode;
}) => {
  const {
    clientId,
    setClientId,
    setQueue,
    setTicket,
    setQueueId,
    setIsInQueue,
    setIsServed,
    isServed,
    isInQueue: inQueueState,
  } = useQueueStore();
  const navigate = useNavigate();
  const { queueId } = useParams();
  const { setError, setIsLoading } = useAppStore();
  const { data, isLoading, error } = useQuery(
    queueQueryOptions.getQueue(queueId!, clientId, {
      enabled: !!queueId && !!clientId,
    }),
  );

  useEffect(() => {
    if (error) {
      setError(normalizeError(error));
    } else {
      setError(null);
    }
    if (isLoading) {
      setIsLoading(true);
    } else {
      setIsLoading(false);
    }
  }, [error, setError, setIsLoading, isLoading]);

  useEffect(() => {
    if (!queueId || clientId) {
      return;
    }

    const session = readQueueSession();

    if (session && String(session.queueId) === String(queueId)) {
      setClientId(session.clientId);
      return;
    }

    setClientId(getOrCreateDeviceId());
  }, [clientId, queueId, setClientId]);

  useEffect(() => {
    if (!queueId) {
      return;
    }

    setQueueId(Number(queueId));
    setIsInQueue(inQueue(queueId, inQueueState));
  }, [inQueueState, queueId, setIsInQueue, setQueueId]);

  useEffect(() => {
    if (data) {
      setQueue(data);
      setTicket(data.client_ticket);
      setIsInQueue(Boolean(data.client_ticket));

      if (data.client_ticket && queueId && clientId) {
        writeQueueSession({
          clientId,
          deviceId: getOrCreateDeviceId(),
          queueId: Number(queueId),
          ticketId: data.client_ticket.id,
        });
      }
      if (data?.client_is_served) {
        setIsServed(true);
      }
    }
  }, [clientId, data, queueId, setIsInQueue, setQueue, setTicket]);

  useEffect(() => {
    if (isServed && queueId) {
      navigate(paths.leftPage(queueId!));
    }
  }, [isServed]);

  return children;
};
