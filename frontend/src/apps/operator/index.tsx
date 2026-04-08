import { queueQueryOptions } from "@shared/entities/queue/api/queries";
import { useQuery } from "@tanstack/react-query";
import { useEffect } from "react";
import { Route, Routes, useParams } from "react-router-dom";
import { useOperatorQueue } from "./store";
import styles from "./OperatorApp.module.scss";
import { TicketsList } from "./features/TicketsList";
import { Controls } from "./features/Controls";
import { QrCode } from "./features/QrCode";

export const OperatorAppInner = () => {
  const { queueId } = useParams();
  const { setQueue, setQueueId } = useOperatorQueue();

  const { data, isLoading, error } = useQuery(
    queueQueryOptions.getQueue(queueId!, null, { enabled: !!queueId }),
  );

  useEffect(() => {
    if (!queueId) {
      return;
    }

    setQueueId(Number(queueId));
  }, [isLoading, error, setQueueId]);

  useEffect(() => {
    if (data) {
      setQueue(data);
    }
  }, [data, setQueue]);

  return (
    <div className={styles.wrapper}>
      <TicketsList />
      <Controls />
      <QrCode />
    </div>
  );
};

export const OperatorApp = () => {
  return (
    <Routes>
      <Route path={"/:queueId"} element={<OperatorAppInner />} />
    </Routes>
  );
};
