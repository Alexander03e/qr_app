import {
  getOrCreateDeviceId,
  getOrCreateQueueToken,
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
    setIsNotArrived,
    isServed,
    isNotArrived,
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
    const queueToken = getOrCreateQueueToken();

    if (session && String(session.queueId) === String(queueId)) {
      setClientId(session.queueToken || session.clientId);
      return;
    }

    setClientId(queueToken);
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
        const queueToken = getOrCreateQueueToken();
        writeQueueSession({
          clientId,
          deviceId: getOrCreateDeviceId(),
          queueToken,
          queueId: Number(queueId),
          ticketId: data.client_ticket.id,
        });
      }
      if (data?.client_is_served) {
        setIsServed(true);
      }
      if (data?.client_is_removed) {
        setIsServed(false);
      }
      setIsNotArrived(Boolean(data?.client_is_not_arrived));
    }
  }, [
    clientId,
    data,
    queueId,
    setIsInQueue,
    setQueue,
    setTicket,
    setIsNotArrived,
    setIsServed,
  ]);

  useEffect(() => {
    if (isServed && queueId) {
      navigate(paths.leftPage(queueId!));
    }
  }, [isServed, queueId, navigate]);

  useEffect(() => {
    if (isNotArrived && queueId) {
      navigate(paths.missedPage(queueId));
    }
  }, [isNotArrived, queueId, navigate]);

  return children;
};
