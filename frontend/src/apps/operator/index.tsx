import { queueQueryOptions } from "@shared/entities/queue/api/queries";
import { useQuery } from "@tanstack/react-query";
import { useEffect } from "react";
import {
  Navigate,
  Route,
  Routes,
  useLocation,
  useParams,
} from "react-router-dom";
import { useOperatorQueue } from "./store";
import styles from "./OperatorApp.module.scss";
import { TicketsList } from "./features/TicketsList";
import { Controls } from "./features/Controls";
import { QrCode } from "./features/QrCode";
import { OperatorLogin } from "./features/Login";
import { operatorAuth } from "./helpers/auth";
import { Spin } from "antd";
import { LoadingOutlined } from "@ant-design/icons";

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
  const location = useLocation();
  const token = operatorAuth.readToken();
  const isLoginRoute = location.pathname.startsWith("/o/login");

  const {
    data: sessionData,
    isLoading: isSessionLoading,
    error: sessionError,
  } = useQuery({
    queryKey: ["operator", "me", token],
    queryFn: () => operatorAuth.me(),
    enabled: Boolean(token) && !isLoginRoute,
    retry: false,
  });

  useEffect(() => {
    if (sessionError) {
      operatorAuth.clearToken();
    }
  }, [sessionError]);

  if (token && !isLoginRoute && isSessionLoading) {
    return <Spin indicator={<LoadingOutlined spin />} />;
  }

  const isAuthorized = Boolean(token) && Boolean(sessionData?.operator);
  const nextUrl = encodeURIComponent(`${location.pathname}${location.search}`);

  return (
    <Routes>
      <Route path="/login" element={<OperatorLogin />} />
      <Route
        path={"/:queueId"}
        element={
          isAuthorized ? (
            <OperatorAppInner />
          ) : (
            <Navigate replace to={`/o/login?next=${nextUrl}`} />
          )
        }
      />
    </Routes>
  );
};
