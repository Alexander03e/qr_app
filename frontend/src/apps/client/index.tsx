import { HomePage } from "./pages/HomePage";
import { GuestPage } from "./pages/GuestPage";
import { Layout } from "./components/Layout";
import { Header } from "./features";
import { useQueueStore } from "./store/queueStore";
import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { queueQueryOptions } from "@shared/entities/queue/api/queries";
import { Route, Routes, useParams } from "react-router-dom";
import { readQueueSession } from "./store/session";

const inQueue = (queueId: string | undefined, queueState: boolean): boolean => {
  if (queueState || !queueId) {
    return queueState;
  }

  const session = readQueueSession();
  return Boolean(session && String(session.queueId) === String(queueId));
};

export const ClientAppInner = () => {
  const {
    setQueue,
    setQueueId,
    setIsInQueue,
    isInQueue: inQueueState,
  } = useQueueStore();
  const { queueId } = useParams();

  const { data, isLoading, error } = useQuery(
    queueQueryOptions.getQueue(queueId!, { enabled: !!queueId }),
  );

  // const { data: ticketData } = useQuery(
  //   queueQueryOptions.getTicket({
  //     enabled: inQueue(queueId, inQueueState),
  //   }),
  // );

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
    }
  }, [data, setQueue]);

  const isUserInQueue = inQueue(queueId, inQueueState);

  const Content = () => {
    if (error) {
      return <div>Error</div>;
    }
    if (isLoading) {
      return <div>Loading...</div>;
    }

    if (isUserInQueue) {
      return <HomePage />;
    }

    return <GuestPage />;
  };

  return <Layout topSlot={<Header />}>{Content()}</Layout>;
};

export const ClientApp = () => {
  return (
    <Routes>
      <Route path="/:queueId" element={<ClientAppInner />} />
    </Routes>
  );
};
